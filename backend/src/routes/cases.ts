import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Get all cases (filtered by user role)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, clientId, propertyId, search } = req.query;

    const where: any = {};

    // Client users can only see their own cases
    if (req.user?.userType === 'client') {
      where.clientId = req.user.clientId;
    } else if (req.user?.userType === 'firm') {
      // Firm users can filter by client
      if (clientId) {
        where.clientId = clientId as string;
      }
    }

    if (status) {
      where.status = status;
    }

    if (propertyId) {
      where.propertyId = propertyId as string;
    }

    if (search) {
      where.OR = [
        { caseNumber: { contains: search as string, mode: 'insensitive' } },
        { courtCaseNumber: { contains: search as string, mode: 'insensitive' } },
        {
          tenants: {
            some: {
              tenant: {
                OR: [
                  { firstName: { contains: search as string, mode: 'insensitive' } },
                  { lastName: { contains: search as string, mode: 'insensitive' } }
                ]
              }
            }
          }
        }
      ];
    }

    const cases = await prisma.case.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        tenants: {
          include: {
            tenant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        assignedAttorney: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            documents: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(cases);
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// Get single case
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const where: any = { id };

    // Client users can only see their own cases
    if (req.user?.userType === 'client') {
      where.clientId = req.user.clientId;
    }

    const caseData = await prisma.case.findFirst({
      where,
      include: {
        client: true,
        property: {
          include: {
            units: true
          }
        },
        tenants: {
          include: {
            tenant: true
          }
        },
        assignedAttorney: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        comments: {
          where: req.user?.userType === 'client' 
            ? { isInternal: false } 
            : undefined,
          include: {
            firmUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            clientUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        events: {
          orderBy: {
            eventDate: 'asc'
          }
        }
      }
    });

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(caseData);
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

// Create new case
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      clientId,
      propertyId,
      tenantIds,
      type,
      reason,
      amountOwed,
      monthsOwed,
      jurisdiction,
      court,
      caresActCompliant,
      rentControlStatus,
      noticeServedDate,
      assignedAttorneyId
    } = req.body;

    // Client users can only create cases for their own client
    const finalClientId = req.user?.userType === 'client' 
      ? req.user.clientId 
      : clientId;

    if (!finalClientId || !propertyId || !type || !reason || !jurisdiction) {
      return res.status(400).json({ 
        error: 'Missing required fields: clientId, propertyId, type, reason, jurisdiction' 
      });
    }

    // Generate case number
    const caseCount = await prisma.case.count({
      where: { clientId: finalClientId }
    });
    const caseNumber = `CASE-${finalClientId.slice(0, 8)}-${String(caseCount + 1).padStart(6, '0')}`;

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        clientId: finalClientId,
        propertyId,
        type,
        reason,
        amountOwed: amountOwed ? parseFloat(amountOwed) : null,
        monthsOwed: monthsOwed ? parseInt(monthsOwed) : null,
        jurisdiction,
        court: court || null,
        caresActCompliant: caresActCompliant || false,
        rentControlStatus: rentControlStatus || null,
        noticeServedDate: noticeServedDate ? new Date(noticeServedDate) : null,
        assignedAttorneyId: assignedAttorneyId || null,
        status: 'INTAKE',
        tenants: tenantIds && tenantIds.length > 0 ? {
          create: tenantIds.map((tenantId: string, index: number) => ({
            tenantId,
            isPrimary: index === 0
          }))
        } : undefined
      },
      include: {
        client: true,
        property: true,
        tenants: {
          include: {
            tenant: true
          }
        }
      }
    });

    // Create initial event
    await prisma.caseEvent.create({
      data: {
        caseId: newCase.id,
        eventType: 'CASE_CREATED',
        title: 'Case Created',
        description: `Case ${caseNumber} created`,
        eventDate: new Date(),
        isCompleted: true
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userType: req.user!.userType,
        firmUserId: req.user?.userType === 'firm' ? req.user.id : undefined,
        action: 'CASE_CREATED',
        entityType: 'Case',
        entityId: newCase.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json(newCase);
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// Update case
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const where: any = { id };

    // Client users can only update their own cases (and only certain fields)
    if (req.user?.userType === 'client') {
      where.clientId = req.user.clientId;
      
      // Restrict what client users can update
      const allowedFields = ['reason', 'amountOwed', 'monthsOwed'];
      Object.keys(updateData).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updateData[key];
        }
      });
    }

    // Convert date strings to Date objects
    if (updateData.filedDate) updateData.filedDate = new Date(updateData.filedDate);
    if (updateData.hearingDate) updateData.hearingDate = new Date(updateData.hearingDate);
    if (updateData.judgmentDate) updateData.judgmentDate = new Date(updateData.judgmentDate);
    if (updateData.writIssuedDate) updateData.writIssuedDate = new Date(updateData.writIssuedDate);
    if (updateData.closedDate) updateData.closedDate = new Date(updateData.closedDate);
    if (updateData.serviceDate) updateData.serviceDate = new Date(updateData.serviceDate);
    if (updateData.noticeServedDate) updateData.noticeServedDate = new Date(updateData.noticeServedDate);

    const updatedCase = await prisma.case.update({
      where,
      data: updateData,
      include: {
        client: true,
        property: true,
        tenants: {
          include: {
            tenant: true
          }
        }
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userType: req.user!.userType,
        firmUserId: req.user?.userType === 'firm' ? req.user.id : undefined,
        action: 'CASE_UPDATED',
        entityType: 'Case',
        entityId: id,
        details: updateData,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json(updatedCase);
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ error: 'Failed to update case' });
  }
});

// Update case status
router.patch('/:id/status', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        property: true
      }
    });

    // Create status change event
    await prisma.caseEvent.create({
      data: {
        caseId: id,
        eventType: 'STATUS_CHANGED',
        title: `Status changed to ${status}`,
        description: `Case status updated`,
        eventDate: new Date(),
        isCompleted: true
      }
    });

    res.json(updatedCase);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Close case
router.post('/:id/close', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const closedCase = await prisma.case.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedDate: new Date()
      }
    });

    // Create closure event
    await prisma.caseEvent.create({
      data: {
        caseId: id,
        eventType: 'CASE_CLOSED',
        title: 'Case Closed',
        description: resolutionNotes || 'Case closed',
        eventDate: new Date(),
        isCompleted: true
      }
    });

    res.json(closedCase);
  } catch (error) {
    console.error('Close case error:', error);
    res.status(500).json({ error: 'Failed to close case' });
  }
});

export { router as caseRoutes };

