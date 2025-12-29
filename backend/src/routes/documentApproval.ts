import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';

const router = express.Router();
const prisma = new PrismaClient();
const notificationService = new NotificationService();

router.use(authenticate);

// Request client approval for a document
router.post('/documents/:id/request-approval', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        case: {
          include: {
            client: {
              include: {
                users: {
                  where: {
                    role: { in: ['CLIENT_ADMIN', 'CLIENT_USER'] },
                    isActive: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update document to require approval
    const updated = await prisma.document.update({
      where: { id },
      data: {
        approvalRequired: true,
        approvalStatus: 'PENDING'
      }
    });

    // Notify client users
    const clientEmails = document.case.client.users.map(u => u.email).filter(Boolean);
    for (const email of clientEmails) {
      await notificationService.sendEmail(
        email,
        'Document Review Required',
        `
          <h2>Document Review Required</h2>
          <p>A document requires your review and approval:</p>
          <ul>
            <li><strong>Case:</strong> ${document.case.caseNumber}</li>
            <li><strong>Document:</strong> ${document.name}</li>
            <li><strong>Type:</strong> ${document.type}</li>
          </ul>
          <p>Please log in to PropertiLaw to review the document.</p>
        `
      );
    }

    res.json(updated);
  } catch (error) {
    console.error('Request approval error:', error);
    res.status(500).json({ error: 'Failed to request approval' });
  }
});

// Approve document (client users)
router.post('/documents/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        case: true
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify user has access (client user for their case, or firm user)
    if (req.user?.userType === 'client' && document.case.clientId !== req.user.clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData: any = {
      approvalStatus: 'APPROVED',
      approvedAt: new Date()
    };

    if (req.user?.userType === 'firm') {
      updateData.approvedById = req.user.id;
    }

    const updated = await prisma.document.update({
      where: { id },
      data: updateData
    });

    // Notify firm users
    if (req.user?.userType === 'client') {
      const firmUsers = await prisma.firmUser.findMany({
        where: {
          lawFirmId: document.case.client.lawFirmId,
          isActive: true
        }
      });

      for (const user of firmUsers) {
        await notificationService.sendEmail(
          user.email,
          'Document Approved',
          `
            <h2>Document Approved</h2>
            <p>The following document has been approved:</p>
            <ul>
              <li><strong>Case:</strong> ${document.case.caseNumber}</li>
              <li><strong>Document:</strong> ${document.name}</li>
            </ul>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          `
        );
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Approve document error:', error);
    res.status(500).json({ error: 'Failed to approve document' });
  }
});

// Reject document (client users)
router.post('/documents/:id/reject', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        case: true
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify user has access
    if (req.user?.userType === 'client' && document.case.clientId !== req.user.clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: reason
      }
    });

    // Notify firm users
    if (req.user?.userType === 'client') {
      const firmUsers = await prisma.firmUser.findMany({
        where: {
          lawFirmId: document.case.client.lawFirmId,
          isActive: true
        }
      });

      for (const user of firmUsers) {
        await notificationService.sendEmail(
          user.email,
          'Document Rejected',
          `
            <h2>Document Rejected</h2>
            <p>The following document has been rejected:</p>
            <ul>
              <li><strong>Case:</strong> ${document.case.caseNumber}</li>
              <li><strong>Document:</strong> ${document.name}</li>
              <li><strong>Reason:</strong> ${reason}</li>
            </ul>
          `
        );
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({ error: 'Failed to reject document' });
  }
});

// Get documents pending approval
router.get('/documents/pending-approval', async (req: AuthRequest, res) => {
  try {
    const where: any = {
      approvalStatus: 'PENDING',
      approvalRequired: true
    };

    if (req.user?.userType === 'client') {
      where.case = {
        clientId: req.user.clientId
      };
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            property: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(documents);
  } catch (error) {
    console.error('Get pending approval error:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

export { router as documentApprovalRoutes };

