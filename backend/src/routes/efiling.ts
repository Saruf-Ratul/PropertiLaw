import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';
import { getEFilingService, COURT_CONFIGS } from '../services/efilingService';
import { NotificationService } from '../services/notificationService';

const router = express.Router();
const prisma = new PrismaClient();
const notificationService = new NotificationService();

router.use(authenticate);
router.use(requireFirmUser);

/**
 * E-Filing Integration Routes (Phase 3)
 * 
 * This module handles electronic court filing integration.
 * Currently stubbed for future implementation.
 */

// Get available courts for e-filing
router.get('/courts', async (req: AuthRequest, res) => {
  try {
    // Get courts from configuration
    const courts = Object.keys(COURT_CONFIGS).map((courtName, index) => {
      const config = COURT_CONFIGS[courtName];
      return {
        id: `court-${index}`,
        name: courtName,
        jurisdiction: courtName.split(' ')[0] + ' County, NJ', // Extract county
        efilingAvailable: true,
        efilingProvider: config.provider === 'tyler-odyssey' ? 'Tyler Odyssey' : 'File & ServeXpress',
        efilingUrl: config.apiUrl,
        requiresAuth: config.requiresAuth
      };
    });

    // Also get courts from database (if stored)
    const dbCourts = await prisma.case.findMany({
      select: {
        court: true,
        jurisdiction: true
      },
      distinct: ['court'],
      where: {
        court: { not: null }
      }
    });

    // Merge and deduplicate
    const allCourts = [...courts];
    dbCourts.forEach(dbCourt => {
      if (dbCourt.court && !allCourts.find(c => c.name === dbCourt.court)) {
        allCourts.push({
          id: `court-db-${allCourts.length}`,
          name: dbCourt.court,
          jurisdiction: dbCourt.jurisdiction || 'Unknown',
          efilingAvailable: false, // Not configured yet
          efilingProvider: 'Not Configured',
          efilingUrl: '',
          requiresAuth: false
        });
      }
    });

    res.json(allCourts);
  } catch (error) {
    console.error('Get courts error:', error);
    res.status(500).json({ error: 'Failed to fetch courts' });
  }
});

// Submit case for e-filing
router.post('/cases/:caseId/file', async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params;
    const { courtName, credentials, paymentMethod } = req.body;

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        documents: {
          where: {
            type: { in: ['COMPLAINT', 'COVER_SHEET', 'FILING_FEE_WAIVER'] }
          }
        },
        property: true,
        tenants: {
          include: {
            tenant: true
          }
        },
        assignedAttorney: true
      }
    });

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (!caseData.court) {
      return res.status(400).json({ error: 'Court not specified for this case' });
    }

    // Get e-filing service for the court
    const eFilingService = getEFilingService(caseData.court, credentials || {});
    
    if (!eFilingService) {
      // Fallback: Manual filing recorded
      const updatedCase = await prisma.case.update({
        where: { id: caseId },
        data: {
          status: 'FILED',
          filedDate: new Date()
        }
      });

      return res.json({
        success: true,
        message: 'E-filing not configured for this court. Case marked as filed manually.',
        case: updatedCase,
        requiresManualFiling: true
      });
    }

    // Prepare documents
    const documents = caseData.documents.map(doc => ({
      path: doc.filePath,
      type: doc.type
    }));

    // Submit filing
    const filingResult = await eFilingService.submitFiling({
      caseId,
      documents,
      caseType: caseData.type,
      parties: [
        ...caseData.tenants.map(ct => ({
          name: `${ct.tenant.firstName} ${ct.tenant.lastName}`,
          role: 'DEFENDANT'
        }))
      ],
      court: caseData.court,
      jurisdiction: caseData.jurisdiction
    });

    if (!filingResult.success) {
      return res.status(400).json({
        success: false,
        error: filingResult.error || 'Filing submission failed'
      });
    }

    // Update case with court information
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        courtCaseNumber: filingResult.courtCaseNumber,
        status: 'FILED',
        filedDate: new Date(),
        hearingDate: filingResult.hearingDate || undefined
      }
    });

    // Create filing event
    await prisma.caseEvent.create({
      data: {
        caseId,
        eventType: 'FILED',
        title: 'Case Filed Electronically',
        description: `Case filed via e-filing. Court case number: ${filingResult.courtCaseNumber}`,
        eventDate: new Date(),
        isCompleted: true
      }
    });

    // Notify attorney
    if (caseData.assignedAttorney) {
      await notificationService.sendEmail(
        caseData.assignedAttorney.email,
        'Case Filed Successfully',
        `
          <h2>Case Filed Successfully</h2>
          <p>Case ${caseData.caseNumber} has been filed electronically:</p>
          <ul>
            <li><strong>Court Case Number:</strong> ${filingResult.courtCaseNumber}</li>
            <li><strong>Court:</strong> ${caseData.court}</li>
            ${filingResult.hearingDate ? `<li><strong>Hearing Date:</strong> ${filingResult.hearingDate.toLocaleDateString()}</li>` : ''}
          </ul>
        `
      );
    }

    res.json({
      success: true,
      message: 'Case filed successfully via e-filing',
      courtCaseNumber: filingResult.courtCaseNumber,
      filingId: filingResult.filingId,
      hearingDate: filingResult.hearingDate,
      fees: filingResult.fees,
      case: updatedCase
    });
  } catch (error: any) {
    console.error('E-file case error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to e-file case' 
    });
  }
});

// Check e-filing status
router.get('/cases/:caseId/status', async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params;
    const { credentials } = req.query;

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        courtCaseNumber: true,
        status: true,
        filedDate: true,
        hearingDate: true,
        court: true
      }
    });

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (!caseData.courtCaseNumber) {
      return res.json({
        caseId: caseData.id,
        status: 'NOT_FILED',
        message: 'Case has not been filed yet'
      });
    }

    // Try to check status from court system if e-filing service available
    if (caseData.court && credentials) {
      try {
        const eFilingService = getEFilingService(caseData.court, JSON.parse(credentials as string));
        if (eFilingService) {
          // Extract filing ID from case number or store separately
          // For now, use court case number as reference
          const statusResult = await eFilingService.checkFilingStatus(caseData.courtCaseNumber);
          
          // Update case if hearing date changed
          if (statusResult.hearingDate && statusResult.hearingDate !== caseData.hearingDate) {
            await prisma.case.update({
              where: { id: caseId },
              data: {
                hearingDate: statusResult.hearingDate
              }
            });
          }

          return res.json({
            caseId: caseData.id,
            courtCaseNumber: caseData.courtCaseNumber,
            status: statusResult.status,
            filedDate: caseData.filedDate,
            hearingDate: statusResult.hearingDate || caseData.hearingDate,
            errors: statusResult.errors,
            lastChecked: new Date()
          });
        }
      } catch (error) {
        console.error('Error checking court status:', error);
        // Fall through to return local status
      }
    }

    // Return local status if court API unavailable
    res.json({
      caseId: caseData.id,
      courtCaseNumber: caseData.courtCaseNumber,
      status: caseData.status,
      filedDate: caseData.filedDate,
      hearingDate: caseData.hearingDate,
      lastChecked: new Date(),
      note: 'Status from local database. Court API not available.'
    });
  } catch (error) {
    console.error('Check e-filing status error:', error);
    res.status(500).json({ error: 'Failed to check e-filing status' });
  }
});

// Get filing fees for a court
router.get('/courts/:courtName/fees', async (req: AuthRequest, res) => {
  try {
    const { courtName } = req.params;
    const { caseType, credentials } = req.query;

    // Try to get fees from court API if available
    if (credentials) {
      try {
        const eFilingService = getEFilingService(courtName, JSON.parse(credentials as string));
        if (eFilingService) {
          const fees = await eFilingService.getFilingFees(
            courtName,
            (caseType as string) || 'NON_PAYMENT'
          );
          
          return res.json({
            courtName,
            caseType: caseType || 'NON_PAYMENT',
            filingFee: fees.filingFee,
            serviceFee: fees.serviceFee,
            totalFee: fees.totalFee,
            currency: 'USD',
            source: 'court_api'
          });
        }
      } catch (error) {
        console.error('Error fetching fees from court API:', error);
        // Fall through to default fees
      }
    }

    // Return default fees based on court type
    const defaultFees: Record<string, { filingFee: number; serviceFee: number }> = {
      'Superior Court': { filingFee: 75.00, serviceFee: 5.00 },
      'Municipal Court': { filingFee: 50.00, serviceFee: 3.00 },
      'default': { filingFee: 75.00, serviceFee: 5.00 }
    };

    const feeStructure = defaultFees[courtName.includes('Superior') ? 'Superior Court' : 'default'];
    const totalFee = feeStructure.filingFee + feeStructure.serviceFee;

    res.json({
      courtName,
      caseType: caseType || 'NON_PAYMENT',
      filingFee: feeStructure.filingFee,
      serviceFee: feeStructure.serviceFee,
      totalFee,
      currency: 'USD',
      source: 'default',
      note: 'Default fees. Connect to court API for accurate fees.'
    });
  } catch (error) {
    console.error('Get filing fees error:', error);
    res.status(500).json({ error: 'Failed to fetch filing fees' });
  }
});

export { router as efilingRoutes };

