import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(requireFirmUser);

// Get all clients
router.get('/', async (req: AuthRequest, res) => {
  try {
    const clients = await prisma.propertyMgmtClient.findMany({
      where: {
        lawFirmId: req.user!.lawFirmId
      },
      include: {
        _count: {
          select: {
            cases: true,
            properties: true,
            users: true
          }
        },
        integrations: {
          select: {
            id: true,
            type: true,
            status: true,
            lastSyncAt: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get single client
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.propertyMgmtClient.findFirst({
      where: {
        id,
        lawFirmId: req.user!.lawFirmId
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLogin: true
          }
        },
        properties: {
          take: 10,
          orderBy: {
            name: 'asc'
          }
        },
        integrations: true,
        _count: {
          select: {
            cases: true,
            properties: true
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create client
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, primaryContact, email, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const client = await prisma.propertyMgmtClient.create({
      data: {
        name,
        primaryContact,
        email,
        phone,
        address,
        lawFirmId: req.user!.lawFirmId!
      }
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const client = await prisma.propertyMgmtClient.update({
      where: {
        id,
        lawFirmId: req.user!.lawFirmId!
      },
      data: updateData
    });

    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

export { router as clientRoutes };

