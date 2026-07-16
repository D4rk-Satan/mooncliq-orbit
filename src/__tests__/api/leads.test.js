/**
 * @jest-environment node
 */
import { GET, POST, PATCH } from '../../app/api/leads/route';
import prisma from '../../lib/prisma';
import { getAuthUser } from '../../lib/auth';

// Mock the dependencies
jest.mock('../../lib/prisma', () => ({
  lead: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  account: { create: jest.fn() },
  task: { create: jest.fn() },
  product: { create: jest.fn() },
  blueprint: {
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  transition: {
    findUnique: jest.fn(),
  }
}));

jest.mock('../../lib/auth', () => ({
  getAuthUser: jest.fn(),
}));

describe('API Route: /api/leads', () => {
  const mockUser = {
    id: 'user-123',
    organizationId: 'org-123',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Method', () => {
    test('returns 401 Unauthorized if user is not authenticated', async () => {
      getAuthUser.mockResolvedValueOnce(null);
      const req = new Request('http://localhost:3000/api/leads');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('returns leads for the authenticated user organization', async () => {
      getAuthUser.mockResolvedValueOnce(mockUser);
      
      const mockLeads = [
        { id: 'lead-1', firstName: 'John', lastName: 'Doe' },
        { id: 'lead-2', firstName: 'Jane', lastName: 'Smith' }
      ];
      prisma.lead.findMany.mockResolvedValueOnce(mockLeads);

      const req = new Request('http://localhost:3000/api/leads');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockLeads);
      
      expect(prisma.lead.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        include: { stage: true, tags: true },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('POST Method', () => {
    test('returns 401 Unauthorized if user is not authenticated', async () => {
      getAuthUser.mockResolvedValueOnce(null);
      const req = new Request('http://localhost:3000/api/leads', { method: 'POST', body: JSON.stringify({}) });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    test('creates a new lead and generates an audit log', async () => {
      getAuthUser.mockResolvedValueOnce(mockUser);
      
      const reqBody = {
        firstName: 'Alice',
        lastName: 'Wonder',
        email: 'alice@example.com',
        phone: '1234567890',
        stageId: 'stage-new',
        blueprintId: 'bp-1'
      };
      
      const createdLead = { id: 'lead-new', ...reqBody };
      prisma.lead.create.mockResolvedValueOnce(createdLead);
      prisma.auditLog.create.mockResolvedValueOnce({});

      const req = new Request('http://localhost:3000/api/leads', { 
        method: 'POST', 
        body: JSON.stringify(reqBody) 
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(createdLead);

      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-123',
          blueprintId: 'bp-1',
          stageId: 'stage-new',
          firstName: 'Alice',
          email: 'alice@example.com'
        }),
        include: { stage: true, tags: true }
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-123',
          leadId: 'lead-new',
          actionType: 'LeadCreated',
          details: { stageId: 'stage-new' }
        })
      });
    });
  });

  describe('PATCH Method', () => {
    test('returns 401 Unauthorized if user is not authenticated', async () => {
      getAuthUser.mockResolvedValueOnce(null);
      const req = new Request('http://localhost:3000/api/leads', { method: 'PATCH', body: JSON.stringify({}) });
      const res = await PATCH(req);
      expect(res.status).toBe(401);
    });

    test('returns 400 if leadId is missing', async () => {
      getAuthUser.mockResolvedValueOnce(mockUser);
      const req = new Request('http://localhost:3000/api/leads', { 
        method: 'PATCH', 
        body: JSON.stringify({ stageId: 'stage-2' }) 
      });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Missing leadId');
    });

    test('returns 404 if lead is not found or not in user organization', async () => {
      getAuthUser.mockResolvedValueOnce(mockUser);
      prisma.lead.findFirst.mockResolvedValueOnce(null); // Not found
      
      const req = new Request('http://localhost:3000/api/leads', { 
        method: 'PATCH', 
        body: JSON.stringify({ leadId: 'lead-unknown' }) 
      });
      const res = await PATCH(req);
      expect(res.status).toBe(404);
    });

    test('updates lead stage, customData, and tags, and creates audit log', async () => {
      getAuthUser.mockResolvedValueOnce(mockUser);
      
      const existingLead = { id: 'lead-123', organizationId: 'org-123' };
      prisma.lead.findFirst.mockResolvedValueOnce(existingLead);
      
      const updatedLead = { id: 'lead-123', stageId: 'stage-2', customData: { vip: true } };
      prisma.lead.update.mockResolvedValueOnce(updatedLead);
      prisma.auditLog.create.mockResolvedValueOnce({});

      const reqBody = {
        leadId: 'lead-123',
        stageId: 'stage-2',
        customData: { vip: true },
        tags: ['tag-1', 'tag-2'],
        transitionId: 'rule-xyz'
      };

      const req = new Request('http://localhost:3000/api/leads', { 
        method: 'PATCH', 
        body: JSON.stringify(reqBody) 
      });
      const res = await PATCH(req);

      expect(res.status).toBe(200);
      
      // Verify prisma update logic
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: expect.objectContaining({
          stageId: 'stage-2',
          customData: { vip: true },
          tags: {
            set: [{ id: 'tag-1' }, { id: 'tag-2' }]
          }
        }),
        include: { stage: true, tags: true }
      });

      // Verify audit log
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-123',
          leadId: 'lead-123',
          actionType: 'StageChanged',
          details: { newStageId: 'stage-2' }
        })
      });
    });

    describe('After Actions: Create Records Edge Cases', () => {
      test('blocks transition and returns 400 if required mapping is missing', async () => {
        getAuthUser.mockResolvedValueOnce(mockUser);
        
        prisma.lead.findFirst.mockResolvedValueOnce({ id: 'lead-1', organizationId: 'org-123', firstName: 'John' });
        
        // Mock transition with createRecords
        prisma.transition.findUnique.mockResolvedValueOnce({
          id: 'rule-missing-data',
          afterActions: {
            createRecords: [{
              targetModule: 'Account',
              autoLink: false,
              mappings: [] // Missing required companyName
            }]
          }
        });

        // Mock Account blueprint
        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-account',
          moduleType: 'Account',
          fields: [],
          stages: [{ id: 'acc-stage-1' }]
        });

        const req = new Request('http://localhost:3000/api/leads', { 
          method: 'PATCH', 
          body: JSON.stringify({ leadId: 'lead-1', stageId: 'stage-2', transitionId: 'rule-missing-data' }) 
        });
        const res = await PATCH(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Strict Data Integrity Error");
        expect(prisma.account.create).not.toHaveBeenCalled();
        expect(prisma.lead.update).not.toHaveBeenCalled();
      });

      test('gracefully parses malformed dynamic variables and succeeds', async () => {
        getAuthUser.mockResolvedValueOnce(mockUser);
        
        prisma.lead.findFirst.mockResolvedValueOnce({ id: 'lead-1', organizationId: 'org-123', firstName: 'John' });
        
        prisma.transition.findUnique.mockResolvedValueOnce({
          id: 'rule-malformed',
          afterActions: {
            createRecords: [{
              targetModule: 'Account',
              autoLink: false,
              mappings: [
                { targetField: 'companyName', sourceField: 'Acme Corp' },
                { targetField: 'customField1', sourceField: '{{Lead.nonExistent}}' }
              ]
            }]
          }
        });

        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-account',
          moduleType: 'Account',
          fields: [],
          stages: [{ id: 'acc-stage-1' }]
        });
        
        prisma.account.create.mockResolvedValueOnce({ id: 'acc-1' });
        prisma.lead.update.mockResolvedValueOnce({ id: 'lead-1' });

        const req = new Request('http://localhost:3000/api/leads', { 
          method: 'PATCH', 
          body: JSON.stringify({ leadId: 'lead-1', stageId: 'stage-2', transitionId: 'rule-malformed' }) 
        });
        const res = await PATCH(req);

        expect(res.status).toBe(200);
        // It should have safely parsed to a blank string
        expect(prisma.account.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            companyName: 'Acme Corp',
            customData: {
              customField1: ''
            }
          })
        });
      });
      
      test('safely skips auto-linking if target lookup field does not exist', async () => {
        getAuthUser.mockResolvedValueOnce(mockUser);
        
        prisma.lead.findFirst.mockResolvedValueOnce({ id: 'lead-1', organizationId: 'org-123', firstName: 'John' });
        
        prisma.transition.findUnique.mockResolvedValueOnce({
          id: 'rule-no-lookup',
          afterActions: {
            createRecords: [{
              targetModule: 'Task',
              autoLink: true, // User wants to auto-link
              mappings: [{ targetField: 'taskName', sourceField: 'New Task' }]
            }]
          }
        });

        // Mock Task Blueprint
        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-task',
          moduleType: 'Task',
          fields: [],
          stages: [{ id: 'task-stage-1' }]
        });
        
        prisma.task.create.mockResolvedValueOnce({ id: 'task-1' });
        
        // Mock Lead Blueprint (No lookup field found!)
        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-lead',
          moduleType: 'Lead',
          fields: [] // No lookup field
        });
        
        prisma.lead.update.mockResolvedValueOnce({ id: 'lead-1' });

        const req = new Request('http://localhost:3000/api/leads', { 
          method: 'PATCH', 
          body: JSON.stringify({ leadId: 'lead-1', stageId: 'stage-2', transitionId: 'rule-no-lookup' }) 
        });
        const res = await PATCH(req);

        expect(res.status).toBe(200);
        // Task should be created
        expect(prisma.task.create).toHaveBeenCalled();
        // Lead should be updated, but WITHOUT the new lookup link
        // Lead should be updated, but WITHOUT the new lookup link
        expect(prisma.lead.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.not.objectContaining({
              customData: expect.any(Object)
            })
          })
        );
      });

      test('creates a Product with standard and custom fields', async () => {
        getAuthUser.mockResolvedValueOnce(mockUser);
        prisma.lead.findFirst.mockResolvedValueOnce({ id: 'lead-1', organizationId: 'org-123' });
        
        prisma.transition.findUnique.mockResolvedValueOnce({
          id: 'rule-product',
          afterActions: {
            createRecords: [{
              targetModule: 'Product',
              autoLink: false,
              mappings: [
                { targetField: 'name', sourceField: 'Enterprise Plan' },
                { targetField: 'sku', sourceField: 'ENT-001' },
                { targetField: 'category', sourceField: 'Software' } // Custom field
              ]
            }]
          }
        });

        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-prod', moduleType: 'Product', fields: [], stages: [{ id: 'prod-stage-1' }]
        });
        prisma.product.create.mockResolvedValueOnce({ id: 'prod-1' });
        prisma.lead.update.mockResolvedValueOnce({ id: 'lead-1' });

        const req = new Request('http://localhost:3000/api/leads', { 
          method: 'PATCH', body: JSON.stringify({ leadId: 'lead-1', stageId: 'stage-2', transitionId: 'rule-product' }) 
        });
        const res = await PATCH(req);

        expect(res.status).toBe(200);
        expect(prisma.product.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Enterprise Plan',
            sku: 'ENT-001',
            customData: { category: 'Software' }
          })
        });
      });

      test('creates a Task and correctly handles multiple placeholders in one mapping', async () => {
        getAuthUser.mockResolvedValueOnce(mockUser);
        prisma.lead.findFirst.mockResolvedValueOnce({ id: 'lead-1', organizationId: 'org-123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' });
        
        prisma.transition.findUnique.mockResolvedValueOnce({
          id: 'rule-task',
          afterActions: {
            createRecords: [{
              targetModule: 'Task',
              autoLink: false,
              mappings: [
                { targetField: 'taskName', sourceField: 'Call {{Lead.firstName}} {{Lead.lastName}} at {{Lead.email}}' }
              ]
            }]
          }
        });

        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-task', moduleType: 'Task', fields: [], stages: [{ id: 'task-stage-1' }]
        });
        prisma.task.create.mockResolvedValueOnce({ id: 'task-1' });
        prisma.lead.update.mockResolvedValueOnce({ id: 'lead-1' });

        const req = new Request('http://localhost:3000/api/leads', { 
          method: 'PATCH', body: JSON.stringify({ leadId: 'lead-1', stageId: 'stage-2', transitionId: 'rule-task' }) 
        });
        const res = await PATCH(req);

        expect(res.status).toBe(200);
        expect(prisma.task.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            taskName: 'Call John Doe at john@example.com'
          })
        });
      });

      test('creates multiple records in a single transition (Account and Task)', async () => {
        getAuthUser.mockResolvedValueOnce(mockUser);
        prisma.lead.findFirst.mockResolvedValueOnce({ id: 'lead-1', organizationId: 'org-123' });
        
        prisma.transition.findUnique.mockResolvedValueOnce({
          id: 'rule-multi',
          afterActions: {
            createRecords: [
              { targetModule: 'Account', autoLink: false, mappings: [{ targetField: 'companyName', sourceField: 'Acme' }] },
              { targetModule: 'Task', autoLink: false, mappings: [{ targetField: 'taskName', sourceField: 'Follow up' }] }
            ]
          }
        });

        // First findFirst is for Account
        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-acc', moduleType: 'Account', fields: [], stages: [{ id: 'acc-stage-1' }]
        });
        // Second findFirst is for Task
        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-task', moduleType: 'Task', fields: [], stages: [{ id: 'task-stage-1' }]
        });
        
        prisma.account.create.mockResolvedValueOnce({ id: 'acc-1' });
        prisma.task.create.mockResolvedValueOnce({ id: 'task-1' });
        prisma.lead.update.mockResolvedValueOnce({ id: 'lead-1' });

        const req = new Request('http://localhost:3000/api/leads', { 
          method: 'PATCH', body: JSON.stringify({ leadId: 'lead-1', stageId: 'stage-2', transitionId: 'rule-multi' }) 
        });
        const res = await PATCH(req);

        expect(res.status).toBe(200);
        expect(prisma.account.create).toHaveBeenCalledTimes(1);
        expect(prisma.task.create).toHaveBeenCalledTimes(1);
      });

      test('successfully auto-links with a multi-select lookup field', async () => {
        getAuthUser.mockResolvedValueOnce(mockUser);
        
        // Lead already has an array of products
        prisma.lead.findFirst.mockResolvedValueOnce({ 
          id: 'lead-1', organizationId: 'org-123', customData: { productIds: ['prod-0'] } 
        });
        
        prisma.transition.findUnique.mockResolvedValueOnce({
          id: 'rule-autolink-multi',
          afterActions: {
            createRecords: [{
              targetModule: 'Product',
              autoLink: true,
              mappings: [
                { targetField: 'name', sourceField: 'New Prod' },
                { targetField: 'sku', sourceField: 'NP-1' }
              ]
            }]
          }
        });

        // 1. Target Blueprint
        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-prod', moduleType: 'Product', fields: [], stages: [{ id: 'prod-stage-1' }]
        });
        prisma.product.create.mockResolvedValueOnce({ id: 'prod-1' });
        
        // 2. Source Blueprint (Lead) with a multi-select lookup field
        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-lead',
          moduleType: 'Lead',
          fields: [{ type: 'lookup', name: 'productIds', targetModule: 'Product', isMultiSelect: true }]
        });
        
        prisma.lead.update.mockResolvedValueOnce({ id: 'lead-1' });

        const req = new Request('http://localhost:3000/api/leads', { 
          method: 'PATCH', body: JSON.stringify({ leadId: 'lead-1', stageId: 'stage-2', transitionId: 'rule-autolink-multi' }) 
        });
        const res = await PATCH(req);

        expect(res.status).toBe(200);
        // The customData should now have BOTH the old and new product IDs
        expect(prisma.lead.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              customData: expect.objectContaining({
                productIds: ['prod-0', 'prod-1']
              })
            })
          })
        );
      });
      test('successfully auto-links with a single-select lookup field', async () => {
        getAuthUser.mockResolvedValueOnce(mockUser);
        
        prisma.lead.findFirst.mockResolvedValueOnce({ 
          id: 'lead-1', organizationId: 'org-123', customData: { accountId: 'acc-old' } 
        });
        
        prisma.transition.findUnique.mockResolvedValueOnce({
          id: 'rule-autolink-single',
          afterActions: {
            createRecords: [{
              targetModule: 'Account',
              autoLink: true,
              mappings: [
                { targetField: 'companyName', sourceField: 'New Account' }
              ]
            }]
          }
        });

        // 1. Target Blueprint
        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-acc', moduleType: 'Account', fields: [], stages: [{ id: 'acc-stage-1' }]
        });
        prisma.account.create.mockResolvedValueOnce({ id: 'acc-new' });
        
        // 2. Source Blueprint (Lead) with a single-select lookup field
        prisma.blueprint.findFirst.mockResolvedValueOnce({
          id: 'bp-lead',
          moduleType: 'Lead',
          fields: [{ type: 'lookup', name: 'accountId', targetModule: 'Account', isMultiSelect: false }]
        });
        
        prisma.lead.update.mockResolvedValueOnce({ id: 'lead-1' });

        const req = new Request('http://localhost:3000/api/leads', { 
          method: 'PATCH', body: JSON.stringify({ leadId: 'lead-1', stageId: 'stage-2', transitionId: 'rule-autolink-single' }) 
        });
        const res = await PATCH(req);

        expect(res.status).toBe(200);
        // The customData should now be OVERWRITTEN with the new account ID
        expect(prisma.lead.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              customData: expect.objectContaining({
                accountId: 'acc-new'
              })
            })
          })
        );
      });
    });
  });
});
