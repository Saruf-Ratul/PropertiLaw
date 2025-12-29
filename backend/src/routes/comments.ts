import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Add comment to case
router.post('/case/:caseId', async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params;
    const { content, isInternal } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify case access
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        ...(req.user?.userType === 'client' ? { clientId: req.user.clientId } : {})
      }
    });

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const commentData: any = {
      caseId,
      content,
      isInternal: isInternal !== false && req.user?.userType === 'firm' ? true : false
    };

    if (req.user?.userType === 'firm') {
      commentData.firmUserId = req.user.id;
      commentData.authorType = 'firm';
    } else {
      commentData.clientUserId = req.user!.id;
      commentData.authorType = 'client';
      commentData.isInternal = false; // Client comments are always visible
    }

    const comment = await prisma.comment.create({
      data: commentData,
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
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export { router as commentRoutes };

