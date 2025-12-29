import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

router.use(authenticate);
router.use(requireFirmUser);

/**
 * Bulk Operations Routes
 * 
 * Handles bulk case creation, bulk document generation, and mass actions
 */

// Bulk create cases from CSV
router.post('/cases/import', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Verify client belongs to firm
    const client = await prisma.propertyMgmtClient.findFirst({
      where: {
        id: clientId,
        lawFirmId: req.user!.lawFirmId!
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Parse CSV
    const cases: any[] = [];
    const stream = Readable.from(req.file.buffer.toString());
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          cases.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Validate and create cases
    const createdCases = [];
    const errors = [];

    for (const row of cases) {
      try {
        // Find property by name or address
        const property = await prisma.property.findFirst({
          where: {
            clientId,
            OR: [
              { name: { contains: row.propertyName || row.property, mode: 'insensitive' } },
              { address: { contains: row.propertyAddress || row.address, mode: 'insensitive' } }
            ]
          }
        });

        if (!property) {
          errors.push({ row, error: 'Property not found' });
          continue;
        }

        // Find tenant
        const tenant = await prisma.tenant.findFirst({
          where: {
            clientId,
            propertyId: property.id,
            OR: [
              {
                firstName: { contains: row.tenantFirstName || row.firstName, mode: 'insensitive' },
                lastName: { contains: row.tenantLastName || row.lastName, mode: 'insensitive' }
              }
            ]
          }
        });

        if (!tenant) {
          errors.push({ row, error: 'Tenant not found' });
          continue;
        }

        // Generate case number
        const caseCount = await prisma.case.count({
          where: { clientId }
        });
        const caseNumber = `CASE-${clientId.slice(0, 8)}-${String(caseCount + 1).padStart(6, '0')}`;

        // Create case
        const newCase = await prisma.case.create({
          data: {
            caseNumber,
            clientId,
            propertyId: property.id,
            type: row.caseType || 'NON_PAYMENT',
            reason: row.reason || 'Non-payment of rent',
            amountOwed: row.amountOwed ? parseFloat(row.amountOwed) : null,
            monthsOwed: row.monthsOwed ? parseInt(row.monthsOwed) : null,
            jurisdiction: row.jurisdiction || property.jurisdiction || '',
            court: row.court || null,
            status: 'INTAKE',
            tenants: {
              create: {
                tenantId: tenant.id,
                isPrimary: true
              }
            }
          }
        });

        createdCases.push(newCase);
      } catch (error: any) {
        errors.push({ row, error: error.message });
      }
    }

    res.json({
      success: true,
      created: createdCases.length,
      errors: errors.length,
      cases: createdCases,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import cases' });
  }
});

// Bulk generate documents
router.post('/documents/generate', async (req: AuthRequest, res) => {
  try {
    const { caseIds, documentType } = req.body;

    if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ error: 'Case IDs array is required' });
    }

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    // TODO: Implement bulk document generation
    // This would generate documents for all specified cases
    const { DocumentGenerator } = await import('../services/documentGenerator');
    
    const results = [];
    const errors = [];

    for (const caseId of caseIds) {
      try {
        const caseData = await prisma.case.findUnique({
          where: { id: caseId },
          include: {
            property: true,
            tenants: {
              include: {
                tenant: true
              }
            },
            client: true
          }
        });

        if (!caseData) {
          errors.push({ caseId, error: 'Case not found' });
          continue;
        }

        // Generate document
        const pdfBuffer = await DocumentGenerator.generateFromTemplate(documentType, caseData);
        
        // Save document (simplified - would need proper file handling)
        const fileName = `${documentType}-${caseData.caseNumber}-${Date.now()}.pdf`;
        const filePath = `./uploads/${fileName}`;
        
        // Create document record
        const document = await prisma.document.create({
          data: {
            caseId,
            type: documentType,
            name: `${documentType.replace('_', ' ')} - ${caseData.caseNumber}`,
            fileName,
            filePath,
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            isGenerated: true,
            uploadedById: req.user!.id
          }
        });

        results.push(document);
      } catch (error: any) {
        errors.push({ caseId, error: error.message });
      }
    }

    res.json({
      success: true,
      generated: results.length,
      errors: errors.length,
      documents: results,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Bulk generate documents error:', error);
    res.status(500).json({ error: 'Failed to generate documents' });
  }
});

// Bulk update case status
router.post('/cases/status', async (req: AuthRequest, res) => {
  try {
    const { caseIds, status } = req.body;

    if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ error: 'Case IDs array is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = await prisma.case.updateMany({
      where: {
        id: { in: caseIds }
      },
      data: {
        status
      }
    });

    // Create events for each case
    for (const caseId of caseIds) {
      await prisma.caseEvent.create({
        data: {
          caseId,
          eventType: 'STATUS_CHANGED',
          title: `Status changed to ${status}`,
          description: 'Bulk status update',
          eventDate: new Date(),
          isCompleted: true
        }
      });
    }

    res.json({
      success: true,
      updated: updated.count,
      status
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({ error: 'Failed to update case statuses' });
  }
});

export { router as bulkRoutes };

