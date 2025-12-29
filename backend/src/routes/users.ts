import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser, authorize } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all users (firm users only)
router.get('/firm', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.firmUser.findMany({
      where: {
        lawFirmId: req.user!.lawFirmId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Get firm users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get client users
router.get('/client', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const users = await prisma.clientUser.findMany({
      where: {
        clientId: clientId as string,
        client: {
          lawFirmId: req.user!.lawFirmId!
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Get client users error:', error);
    res.status(500).json({ error: 'Failed to fetch client users' });
  }
});

// Create firm user
router.post('/firm', authorize('LAW_FIRM_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existing = await prisma.firmUser.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.firmUser.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        lawFirmId: req.user!.lawFirmId!
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create firm user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Create client user
router.post('/client', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { email, password, firstName, lastName, role, clientId } = req.body;

    if (!email || !password || !firstName || !lastName || !clientId) {
      return res.status(400).json({ error: 'All fields are required' });
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

    // Check if user exists
    const existing = await prisma.clientUser.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.clientUser.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role || 'CLIENT_USER',
        clientId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create client user error:', error);
    res.status(500).json({ error: 'Failed to create client user' });
  }
});

// Update user
router.put('/:id', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove password from update if present (use separate endpoint)
    delete updateData.password;
    delete updateData.passwordHash;

    // Determine if firm or client user
    let user;
    const firmUser = await prisma.firmUser.findUnique({
      where: { id }
    });

    if (firmUser) {
      if (firmUser.lawFirmId !== req.user!.lawFirmId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      user = await prisma.firmUser.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true
        }
      });
    } else {
      const clientUser = await prisma.clientUser.findUnique({
        where: { id },
        include: { client: true }
      });

      if (!clientUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (clientUser.client.lawFirmId !== req.user!.lawFirmId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      user = await prisma.clientUser.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true
        }
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export { router as userRoutes };

