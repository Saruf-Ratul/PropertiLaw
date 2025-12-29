import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    lawFirmId?: string;
    clientId?: string;
    userType: 'firm' | 'client';
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: string;
      userType: 'firm' | 'client';
    };

    // Fetch user from database
    if (decoded.userType === 'firm') {
      const user = await prisma.firmUser.findUnique({
        where: { id: decoded.userId },
        include: { lawFirm: true }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid or inactive user' });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        lawFirmId: user.lawFirmId,
        userType: 'firm'
      };
    } else {
      const user = await prisma.clientUser.findUnique({
        where: { id: decoded.userId },
        include: { client: true }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid or inactive user' });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        userType: 'client'
      };
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireFirmUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.userType !== 'firm') {
    return res.status(403).json({ error: 'Firm user access required' });
  }
  next();
};

export const requireClientUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.userType !== 'client') {
    return res.status(403).json({ error: 'Client user access required' });
  }
  next();
};

