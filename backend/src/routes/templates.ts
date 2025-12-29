import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser, authorize } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({
  dest: './templates',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  }
});

// Ensure templates directory exists
const templatesDir = './templates';
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

router.use(authenticate);
router.use(requireFirmUser);

// Get all templates
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { jurisdiction, type, isActive } = req.query;

    const where: any = {};
    if (jurisdiction) where.jurisdiction = jurisdiction;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const templates = await prisma.documentTemplate.findMany({
      where,
      orderBy: [
        { jurisdiction: 'asc' },
        { type: 'asc' },
        { version: 'desc' }
      ]
    });

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.documentTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create template
router.post('/', authorize('LAW_FIRM_ADMIN'), upload.single('template'), async (req: AuthRequest, res) => {
  try {
    const { name, type, jurisdiction, mergeFields } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Template file is required' });
    }

    if (!name || !type || !jurisdiction) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Name, type, and jurisdiction are required' });
    }

    // Check for existing template
    const existing = await prisma.documentTemplate.findFirst({
      where: {
        name,
        type,
        jurisdiction,
        isActive: true
      },
      orderBy: {
        version: 'desc'
      }
    });

    const version = existing ? existing.version + 1 : 1;

    // Move file to permanent location
    const finalPath = path.join(templatesDir, `${name}-${jurisdiction}-v${version}${path.extname(req.file.originalname)}`);
    fs.renameSync(req.file.path, finalPath);

    const template = await prisma.documentTemplate.create({
      data: {
        name,
        type,
        jurisdiction,
        version,
        templatePath: finalPath,
        mergeFields: mergeFields ? JSON.parse(mergeFields) : null,
        isActive: true
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', authorize('LAW_FIRM_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, mergeFields } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (mergeFields) updateData.mergeFields = typeof mergeFields === 'string' ? JSON.parse(mergeFields) : mergeFields;

    const template = await prisma.documentTemplate.update({
      where: { id },
      data: updateData
    });

    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (deactivate)
router.delete('/:id', authorize('LAW_FIRM_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.documentTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Deactivate instead of deleting
    await prisma.documentTemplate.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Template deactivated successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Download template file
router.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.documentTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!fs.existsSync(template.templatePath)) {
      return res.status(404).json({ error: 'Template file not found' });
    }

    res.download(template.templatePath, `${template.name}-v${template.version}${path.extname(template.templatePath)}`);
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({ error: 'Failed to download template' });
  }
});

export { router as templateRoutes };

