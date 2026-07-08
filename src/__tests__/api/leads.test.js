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
  });
});
