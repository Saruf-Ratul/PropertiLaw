import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get properties
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { clientId, search } = req.query;

    const where: any = {};

    // Client users can only see their own properties
    if (req.user?.userType === 'client') {
      where.clientId = req.user.clientId;
    } else if (req.user?.userType === 'firm') {
      if (clientId) {
        where.clientId = clientId as string;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const properties = await prisma.property.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        },
        units: {
          include: {
            tenants: {
              where: {
                isActive: true
              }
            }
          }
        },
        _count: {
          select: {
            cases: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(properties);
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get single property
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const where: any = { id };

    if (req.user?.userType === 'client') {
      where.clientId = req.user.clientId;
    }

    const property = await prisma.property.findFirst({
      where,
      include: {
        client: true,
        units: {
          include: {
            tenants: {
              where: {
                isActive: true
              }
            }
          }
        },
        cases: {
          include: {
            tenants: {
              include: {
                tenant: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Get tenants for a property
router.get('/:id/tenants', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(req.user?.userType === 'client' ? { clientId: req.user.clientId } : {})
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const tenants = await prisma.tenant.findMany({
      where: {
        propertyId: id,
        isActive: true
      },
      include: {
        unit: true
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    res.json(tenants);
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

export { router as propertyRoutes };

