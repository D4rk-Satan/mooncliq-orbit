import prisma from '../lib/prisma';
import { runScriptInLambda } from '../lib/lambdaExecutor';

/**
 * Executes matching backend workflows for a specific record event.
 * 
 * @param {string} organizationId - The tenant ID
 * @param {string} moduleType - 'Lead', 'Deal', 'Account', etc.
 * @param {string} recordEvent - 'Created' or 'Edited'
 * @param {object} recordData - The full data object of the record
 */
export async function executeBackendWorkflows(organizationId, moduleType, recordEvent, recordData) {
    try {
        // Find all active workflows that match the current event

        // 1. Task-Specific Direct Automation (Only runs when task is ACTIVE, and never if moved/completed):
        if (moduleType === 'Task' && recordData?.taskAutomation && recordData.taskAutomation !== 'None' && recordEvent === 'DueTimeReached') {
            // Task ka latest status check karo database se (kya task move ho chuka hai?)
            const currentTask = await prisma.task.findUnique({
                where: { id: recordData.id },
                include: { stage: true }
            });

            const stageName = currentTask?.stage?.name?.toLowerCase() || '';
            if (!currentTask || stageName === 'completed' || stageName === 'overdue' || stageName === 'done') {
                console.log(`[Workflow Engine] Task ${recordData.id} is already moved/closed (${stageName}). Skipping automation.`);
                return;
            }

            const specificWorkflow = await prisma.workflowRule.findFirst({
                where: {
                    organizationId,
                    name: recordData.taskAutomation,
                    isActive: true
                }
            });

            if (specificWorkflow && specificWorkflow.code) {
                console.log(`[Workflow Engine] Executing assigned Task Automation: ${specificWorkflow.name}`);
                runScriptInLambda(specificWorkflow.code, {
                    record: currentTask,
                    event: recordEvent,
                    taskAutomation: recordData.taskAutomation
                }).catch(err => {
                    console.error(`[Workflow Engine] Error running assigned task automation ${specificWorkflow.name}:`, err);
                });
            }
            return; // Task automation execute hone ke baad general workflows trigger na hon
        }




        // We look for 'AfterSubmit' triggers specifically for backend automation
        // CRITICAL: Jo scripts Task Automation ke dropdown me assign hoti hain, 
        // wo generic record creation (Lead/Deal Created) par AUTOMATICALLY nahi chalni chahiye.
        const workflows = await prisma.workflowRule.findMany({
            where: {
                organizationId,
                moduleType,
                isActive: true,
                triggerCategory: 'AfterSubmit',
                OR: [
                    { recordEvent },
                    { recordEvent: 'CreatedOrEdited' }
                ]
            }
        });

        if (workflows.length === 0) return;

        // Fetch all taskAutomation names currently designated for Tasks to prevent accidental trigger
        const activeTaskAutomations = await prisma.task.findMany({
            where: {
                organizationId,
                taskAutomation: { not: null }
            },
            select: { taskAutomation: true },
            distinct: ['taskAutomation']
        });
        const taskAutomationNames = new Set(activeTaskAutomations.map(t => t.taskAutomation).filter(Boolean));

        // Filter out workflows that are actually designated for Task dropdowns
        const eligibleWorkflows = moduleType !== 'Task'
            ? workflows.filter(w => !taskAutomationNames.has(w.name))
            : workflows;

        if (eligibleWorkflows.length === 0) return;

        console.log(`[Workflow Engine] Found ${eligibleWorkflows.length} general workflows for ${moduleType} -> ${recordEvent}`);

        // Execute them asynchronously so we don't block the API response
        eligibleWorkflows.forEach(async (workflow) => {
            try {
                console.log(`[Workflow Engine] Executing: ${workflow.name}`);

                const result = await runScriptInLambda(workflow.code, {
                    record: recordData,
                    event: recordEvent
                });

                console.log(`[Workflow Engine] Result for ${workflow.name}:`, result);
            } catch (err) {
                console.error(`[Workflow Engine] Error executing ${workflow.name}:`, err);
            }
        });

    } catch (error) {
        console.error("[Workflow Engine] Core Engine Error:", error);
    }
}
