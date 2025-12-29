import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';
import { getEFilingService } from '../services/efilingService';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(requireFirmUser);

/**
 * E-Filing Status Management Routes
 */

// Get e-filing status for all cases
router.get('/status', async (req: AuthRequest, res) => {
  try {
    const { court } = req.query;

    const where: any = {
      courtCaseNumber: { not: null },
      status: { in: ['FILED', 'HEARING_SCHEDULED'] }
    };

    if (court) {
      where.court = court;
    }

    const cases = await prisma.case.findMany({
      where,
      select: {
        id: true,
        caseNumber: true,
        courtCaseNumber: true,
        court: true,
        status: true,
        filedDate: true,
        hearingDate: true
      },
      orderBy: {
        filedDate: 'desc'
      }
    });

    res.json(cases);
  } catch (error) {
    console.error('Get e-filing status error:', error);
    res.status(500).json({ error: 'Failed to fetch e-filing status' });
  }
});

// Refresh status for a specific case
router.post('/cases/:caseId/refresh-status', async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params;
    const { credentials } = req.body;

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        courtCaseNumber: true,
        court: true,
        status: true
      }
    });

    if (!caseData || !caseData.courtCaseNumber || !caseData.court) {
      return res.status(400).json({ error: 'Case not filed or court information missing' });
    }

    if (!credentials || !credentials.apiKey) {
      return res.status(400).json({ error: 'E-filing credentials required' });
    }

    const eFilingService = getEFilingService(caseData.court, credentials);
    if (!eFilingService) {
      return res.status(400).json({ error: 'E-filing not configured for this court' });
    }

    const statusResult = await eFilingService.checkFilingStatus(caseData.courtCaseNumber);

    // Update case if status changed
    const updateData: any = {};
    if (statusResult.hearingDate) {
      updateData.hearingDate = statusResult.hearingDate;
    }
    if (statusResult.status && statusResult.status !== caseData.status) {
      // Map court status to case status
      if (statusResult.status === 'ACCEPTED' || statusResult.status === 'FILED') {
        updateData.status = 'FILED';
      } else if (statusResult.status.includes('HEARING')) {
        updateData.status = 'HEARING_SCHEDULED';
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.case.update({
        where: { id: caseId },
        data: updateData
      });
    }

    res.json({
      success: true,
      status: statusResult.status,
      hearingDate: statusResult.hearingDate,
      errors: statusResult.errors,
      updated: Object.keys(updateData).length > 0
    });
  } catch (error: any) {
    console.error('Refresh e-filing status error:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh status' });
  }
});

export { router as efilingStatusRoutes };

