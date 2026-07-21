import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';
import { executeBiDirectionalSync } from '../../../lib/syncLookups';

export async function GET(request) {
  console.log("PRISMA KEYS:", Object.keys(prisma));
  console.log("PRISMA USER:", typeof prisma.user);
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("USER PROFILE CHECK:", {
      canAccessSettings: user.profile?.canAccessSettings,
      DealView: user.profile?.permissions?.Deal?.view,
      rawProfile: user.profile
    });

    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Deal?.view) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view Deals" }, { status: 403 });
    }

    const whereClause = { organizationId: user.organizationId };
    
    // Apply Data Visibility Rules
    if (!user.profile?.canAccessSettings && user.profile?.permissions?.Deal?.visibility === 'private') {
      whereClause.owner = user.email; // Assuming owner field holds email
    }

    const Deals = await prisma.deal.findMany({
      where: whereClause,
      include: {
        stage: true,
        tags: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(Deals);
  } catch (error) {
    console.error("Error fetching Deals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Deal?.create) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create Deals" }, { status: 403 });
    }

    const data = await request.json();
    const { firstName, lastName, email, phone, owner, stageId, customData, blueprintId } = data;

    const newDeal = await prisma.deal.create({
      data: {
        organizationId: user.organizationId,
        blueprintId,
        stageId,
        firstName,
        lastName,
        email,
        phone,
        owner,
        customData: customData || {}
      },
      include: {
        stage: true,
        tags: true
      }
    });

    // Generate Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        DealId: newDeal.id,
        actionType: "DealCreated",
        details: { stageId }
      }
    });

    return NextResponse.json(newDeal);
  } catch (error) {
    console.error("Error creating Deal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Deal?.edit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit Deals" }, { status: 403 });
    }

    const data = await request.json();
    const { DealId, stageId, customData, tags, transitionId } = data;

    if (!DealId) {
      return NextResponse.json({ error: "Missing DealId" }, { status: 400 });
    }

    // Verify Deal belongs to user's org
    const whereClause = { id: DealId, organizationId: user.organizationId };
    
    // Apply Data Visibility Rules
    if (!user.profile?.canAccessSettings && user.profile?.permissions?.Deal?.visibility === 'private') {
      whereClause.owner = user.email;
    }

    const existingDeal = await prisma.deal.findFirst({
      where: whereClause
    });

    if (!existingDeal) {
      return NextResponse.json({ error: "Deal not found or you do not have permission to edit it" }, { status: 404 });
    }

    let updateData = {};
    if (stageId) updateData.stageId = stageId;
    if (customData) updateData.customData = customData;
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        updateData.tags = {
          set: tags.map(tagId => ({ id: typeof tagId === 'object' ? tagId.id : tagId }))
        };
      }
    }

    // --- AFTER ACTIONS: FIELD UPDATES ---
    if (transitionId) {
      const transition = await prisma.transition.findUnique({
        where: { id: transitionId }
      });
      if (transition && transition.afterActions && typeof transition.afterActions === 'object') {
        const fieldUpdates = transition.afterActions.fieldUpdates;
        if (Array.isArray(fieldUpdates) && fieldUpdates.length > 0) {
          // We need to parse customData if we are modifying it
          let mergedCustomData = updateData.customData || (typeof existingDeal.customData === 'string' ? JSON.parse(existingDeal.customData || "{}") : existingDeal.customData);
          if (typeof mergedCustomData === 'string') {
            try { mergedCustomData = JSON.parse(mergedCustomData); } catch(e) { mergedCustomData = {}; }
          }
          
          fieldUpdates.forEach(update => {
            const { field, value } = update;
            // standard fields
            if (['firstName', 'lastName', 'email', 'phone', 'owner'].includes(field)) {
              updateData[field] = value;
            } else {
              // custom dynamic fields
              mergedCustomData[field] = value;
            }
          });
          
          updateData.customData = mergedCustomData;
        }

        // --- AFTER ACTIONS: TAGS ---
        const actionTags = transition.afterActions.tags;
        if (Array.isArray(actionTags) && actionTags.length > 0) {
          // actionTags are the tags to be assigned
          const connectTags = actionTags.map(tag => ({ id: typeof tag === 'object' ? tag.id : tag }));
          if (!updateData.tags) {
            updateData.tags = {};
          }
          if (updateData.tags.set) {
            // Merge with explicitly set tags (not realistic to happen simultaneously, but safe)
            updateData.tags.set = [...updateData.tags.set, ...connectTags];
          } else {
            // Safely connect without overwriting existing tags
            updateData.tags.connect = connectTags;
          }
        }

        // --- AFTER ACTIONS: CREATE RECORDS ---
        const createRecords = transition.afterActions.createRecords;
        if (Array.isArray(createRecords) && createRecords.length > 0) {
          for (const action of createRecords) {
            // Find target blueprint
            const targetBlueprint = await prisma.blueprint.findFirst({
              where: { organizationId: user.organizationId, moduleType: action.targetModule },
              include: { fields: true, stages: { orderBy: { orderIndex: 'asc' } } }
            });
            if (!targetBlueprint) {
              return NextResponse.json({ error: `Strict Data Integrity Error: Target module blueprint not found for ${action.targetModule}` }, { status: 400 });
            }

            const requiredFields = targetBlueprint.fields.filter(f => f.isRequired).map(f => f.name);
            const standardRequired = action.targetModule === 'Account' ? ['companyName'] : action.targetModule === 'Task' ? ['taskName'] : action.targetModule === 'Product' ? ['name', 'sku'] : action.targetModule === 'Deal' ? ['firstName', 'lastName'] : action.targetModule === 'Lead' ? ['firstName', 'lastName'] : [];

            // Compile the mapping data
            const mappedData = {};
            for (const map of (action.mappings || [])) {
               let val = map.sourceField;
               // parse dynamic variables e.g. {{Deal.firstName}}
               val = val.replace(/\{\{[^}]+\}\}/g, (match) => {
                 const matchContent = match.slice(2, -2).trim(); // Remove {{ and }}
                 const parts = matchContent.split('.');
                 const fieldName = parts.length > 1 ? parts[1] : parts[0];
                 
                 if (['firstName', 'lastName', 'email', 'phone', 'owner'].includes(fieldName)) {
                   return existingDeal[fieldName] || updateData[fieldName] || '';
                 }
                 const cData = updateData.customData || (typeof existingDeal.customData === 'string' ? JSON.parse(existingDeal.customData || "{}") : existingDeal.customData) || {};
                 return cData[fieldName] || '';
               });
               mappedData[map.targetField] = val;
            }

            // Verify integrity
            for (const req of [...requiredFields, ...standardRequired]) {
              if (!mappedData[req]) {
                return NextResponse.json({ error: `Strict Data Integrity Error: Auto-Create failed. Target module '${action.targetModule}' requires field '${req}' but it was not mapped.` }, { status: 400 });
              }
            }
            
            let targetStageId = targetBlueprint.stages[0]?.id;
            if (!targetStageId) {
               const defaultStage = await prisma.stage.create({
                 data: { blueprintId: targetBlueprint.id, name: 'New', orderIndex: 0 }
               });
               targetStageId = defaultStage.id;
            }

            // Build Prisma payload
            const createPayload = {
              organizationId: user.organizationId,
              blueprintId: targetBlueprint.id,
              stageId: targetStageId, // Safely grabbed or created
              customData: {}
            };

            for (const key of Object.keys(mappedData)) {
              if (standardRequired.includes(key)) {
                createPayload[key] = mappedData[key];
              } else {
                createPayload.customData[key] = mappedData[key];
              }
            }

            // Execute Create
            let createdRecord;
            if (action.targetModule === 'Account') {
               createdRecord = await prisma.account.create({ data: createPayload });
            } else if (action.targetModule === 'Task') {
               createdRecord = await prisma.task.create({ data: createPayload });
            } else if (action.targetModule === 'Product') {
               createdRecord = await prisma.product.create({ data: createPayload });
            } else if (action.targetModule === 'Deal') {
               createdRecord = await prisma.deal.create({ data: createPayload });
            } else if (action.targetModule === 'Lead') {
               createdRecord = await prisma.lead.create({ data: createPayload });
            }

            // Handle Auto Link
            if (action.autoLink && createdRecord) {
               // Find if there is a Lookup field in Deal pointing to targetModule
               const DealBlueprint = await prisma.blueprint.findFirst({
                 where: { organizationId: user.organizationId, moduleType: 'Deal' },
                 include: { fields: true }
               });
               
               if (DealBlueprint) {
                 const lookupField = DealBlueprint.fields.find(f => f.type === 'lookup' && f.targetModule === action.targetModule);
                 if (lookupField) {
                   let mergedCustomData = updateData.customData || (typeof existingDeal.customData === 'string' ? JSON.parse(existingDeal.customData || "{}") : existingDeal.customData);
                   if (lookupField.isMultiSelect) {
                     const existing = Array.isArray(mergedCustomData[lookupField.name]) ? mergedCustomData[lookupField.name] : [];
                     if (!existing.includes(createdRecord.id)) {
                       mergedCustomData[lookupField.name] = [...existing, createdRecord.id];
                     }
                   } else {
                     mergedCustomData[lookupField.name] = createdRecord.id;
                   }
                   updateData.customData = mergedCustomData;
                 }
               }
            }
          }
        }
      }
    }

    const updatedDeal = await prisma.deal.update({
      where: { id: DealId },
      data: updateData,
      include: { 
        stage: true,
        tags: true
      }
    });

    // Generate Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        DealId: updatedDeal.id,
        actionType: "StageChanged",
        details: { newStageId: stageId }
      }
    });

    return NextResponse.json(updatedDeal);
  } catch (error) {
    console.error("Error updating Deal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
