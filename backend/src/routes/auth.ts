import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Try firm user first
    let user = await prisma.firmUser.findUnique({
      where: { email },
      include: { lawFirm: true }
    });

    let userType: 'firm' | 'client' = 'firm';

    if (!user) {
      // Try client user
      user = await prisma.clientUser.findUnique({
        where: { email },
        include: { client: true }
      }) as any;
      userType = 'client';
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    if (userType === 'firm') {
      await prisma.firmUser.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
    } else {
      await prisma.clientUser.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        userType
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        userType,
        lawFirmId: userType === 'firm' ? (user as any).lawFirmId : undefined,
        clientId: userType === 'client' ? (user as any).clientId : undefined
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user?.userType === 'firm') {
      const user = await prisma.firmUser.findUnique({
        where: { id: req.user.id },
        include: { lawFirm: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          lawFirm: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      return res.json({ user, userType: 'firm' });
    } else {
      const user = await prisma.clientUser.findUnique({
        where: { id: req.user!.id },
        include: { client: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          client: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      return res.json({ user, userType: 'client' });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Change password
router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    let user;
    if (req.user?.userType === 'firm') {
      user = await prisma.firmUser.findUnique({
        where: { id: req.user.id }
      });
    } else {
      user = await prisma.clientUser.findUnique({
        where: { id: req.user!.id }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (req.user?.userType === 'firm') {
      await prisma.firmUser.update({
        where: { id: req.user.id },
        data: { passwordHash: hashedPassword }
      });
    } else {
      await prisma.clientUser.update({
        where: { id: req.user!.id },
        data: { passwordHash: hashedPassword }
      });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export { router as authRoutes };

