import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser, authorize } from '../middleware/auth';
import { COURT_CONFIGS } from '../services/efilingService';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(requireFirmUser);
router.use(authorize('LAW_FIRM_ADMIN'));

/**
 * Court Configuration Routes
 * Manage e-filing court configurations
 */

// Get all court configurations
router.get('/', async (req: AuthRequest, res) => {
  try {
    const courts = Object.keys(COURT_CONFIGS).map((name, index) => ({
      id: `court-${index}`,
      name,
      ...COURT_CONFIGS[name]
    }));

    res.json(courts);
  } catch (error) {
    console.error('Get court configs error:', error);
    res.status(500).json({ error: 'Failed to fetch court configurations' });
  }
});

// Get single court configuration
router.get('/:courtName', async (req: AuthRequest, res) => {
  try {
    const { courtName } = req.params;
    const config = COURT_CONFIGS[courtName];

    if (!config) {
      return res.status(404).json({ error: 'Court configuration not found' });
    }

    res.json({
      name: courtName,
      ...config
    });
  } catch (error) {
    console.error('Get court config error:', error);
    res.status(500).json({ error: 'Failed to fetch court configuration' });
  }
});

// Add/update court configuration
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { courtName, provider, apiUrl, requiresAuth } = req.body;

    if (!courtName || !provider || !apiUrl) {
      return res.status(400).json({ error: 'Court name, provider, and API URL are required' });
    }

    // Note: COURT_CONFIGS is a constant, so this would typically be stored in database
    // For now, return success message
    res.json({
      message: 'Court configuration would be saved (implement database storage)',
      court: {
        name: courtName,
        provider,
        apiUrl,
        requiresAuth: requiresAuth || false
      }
    });
  } catch (error) {
    console.error('Add court config error:', error);
    res.status(500).json({ error: 'Failed to add court configuration' });
  }
});

export { router as courtConfigRoutes };

