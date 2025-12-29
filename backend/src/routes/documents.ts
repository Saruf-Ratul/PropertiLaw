import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';
import { DocumentGenerator } from '../services/documentGenerator';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520') // 20MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'));
    }
  }
});

router.use(authenticate);

// Get documents for a case
router.get('/case/:caseId', async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params;

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

    const documents = await prisma.document.findMany({
      where: { caseId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        uploadedByClient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        approvedBy: {
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
    });

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Upload document
router.post('/upload', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const { caseId, type, name } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!caseId || !type) {
      return res.status(400).json({ error: 'Case ID and document type are required' });
    }

    // Verify case access
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        ...(req.user?.userType === 'client' ? { clientId: req.user.clientId } : {})
      }
    });

    if (!caseData) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Case not found' });
    }

    const document = await prisma.document.create({
      data: {
        caseId,
        type,
        name: name || req.file.originalname,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        isGenerated: false,
        uploadedById: req.user?.userType === 'firm' ? req.user.id : undefined,
        uploadedByClientId: req.user?.userType === 'client' ? req.user.id : undefined
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userType: req.user!.userType,
        firmUserId: req.user?.userType === 'firm' ? req.user.id : undefined,
        action: 'DOCUMENT_UPLOADED',
        entityType: 'Document',
        entityId: document.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Download document
router.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        case: true
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify case access
    if (req.user?.userType === 'client' && document.case.clientId !== req.user.clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(document.filePath, document.name);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Delete document
router.delete('/:id', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await prisma.document.delete({
      where: { id }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Generate document from template
router.post('/generate', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { caseId, documentType, templateId } = req.body;

    if (!caseId || !documentType) {
      return res.status(400).json({ error: 'Case ID and document type are required' });
    }

    // Fetch case data
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
      return res.status(404).json({ error: 'Case not found' });
    }

    // Generate document
    const pdfBuffer = await DocumentGenerator.generateFromTemplate(documentType, caseData);

    // Save document
    const fileName = `${documentType}-${caseData.caseNumber}-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

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
        templateId: templateId || null,
        uploadedById: req.user!.id
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userType: req.user!.userType,
        firmUserId: req.user!.id,
        action: 'DOCUMENT_GENERATED',
        entityType: 'Document',
        entityId: document.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Generate document error:', error);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

export { router as documentRoutes };

