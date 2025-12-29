import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser, authorize } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(requireFirmUser);
router.use(authorize('LAW_FIRM_ADMIN'));

// Get firm settings
router.get('/', async (req: AuthRequest, res) => {
  try {
    const lawFirmId = req.user!.lawFirmId!;

    let settings = await prisma.firmSettings.findUnique({
      where: { lawFirmId },
      include: {
        lawFirm: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            logoUrl: true
          }
        }
      }
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.firmSettings.create({
        data: {
          lawFirmId,
          syncSchedule: '0 2 * * *',
          dataRetentionYears: 7
        },
        include: {
          lawFirm: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              email: true,
              logoUrl: true
            }
          }
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update firm settings
router.put('/', async (req: AuthRequest, res) => {
  try {
    const lawFirmId = req.user!.lawFirmId!;
    const {
      defaultNotificationEmail,
      syncSchedule,
      dataRetentionYears,
      brandingLogo,
      firmName,
      firmAddress,
      firmPhone,
      firmEmail,
      firmLogoUrl
    } = req.body;

    // Update firm info if provided
    if (firmName || firmAddress || firmPhone || firmEmail || firmLogoUrl) {
      await prisma.lawFirm.update({
        where: { id: lawFirmId },
        data: {
          ...(firmName && { name: firmName }),
          ...(firmAddress && { address: firmAddress }),
          ...(firmPhone && { phone: firmPhone }),
          ...(firmEmail && { email: firmEmail }),
          ...(firmLogoUrl && { logoUrl: firmLogoUrl })
        }
      });
    }

    // Update or create settings
    const settings = await prisma.firmSettings.upsert({
      where: { lawFirmId },
      update: {
        ...(defaultNotificationEmail !== undefined && { defaultNotificationEmail }),
        ...(syncSchedule !== undefined && { syncSchedule }),
        ...(dataRetentionYears !== undefined && { dataRetentionYears }),
        ...(brandingLogo !== undefined && { brandingLogo })
      },
      create: {
        lawFirmId,
        defaultNotificationEmail: defaultNotificationEmail || null,
        syncSchedule: syncSchedule || '0 2 * * *',
        dataRetentionYears: dataRetentionYears || 7,
        brandingLogo: brandingLogo || null
      },
      include: {
        lawFirm: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            logoUrl: true
          }
        }
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as settingsRoutes };

