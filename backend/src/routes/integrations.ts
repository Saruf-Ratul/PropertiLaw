import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(requireFirmUser);

// Get integrations for a client
router.get('/client/:clientId', async (req: AuthRequest, res) => {
  try {
    const { clientId } = req.params;

    const client = await prisma.propertyMgmtClient.findFirst({
      where: {
        id: clientId,
        lawFirmId: req.user!.lawFirmId!
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const integrations = await prisma.integration.findMany({
      where: { clientId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(integrations);
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// Create integration
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      clientId,
      type,
      apiKey,
      apiSecret,
      apiUrl,
      sftpHost,
      sftpPort,
      sftpUser,
      sftpPassword,
      sftpPath
    } = req.body;

    if (!clientId || !type) {
      return res.status(400).json({ error: 'Client ID and integration type are required' });
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

    const integration = await prisma.integration.create({
      data: {
        clientId,
        type,
        status: 'PENDING',
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        apiUrl: apiUrl || null,
        sftpHost: sftpHost || null,
        sftpPort: sftpPort || null,
        sftpUser: sftpUser || null,
        sftpPassword: sftpPassword || null,
        sftpPath: sftpPath || null
      }
    });

    res.status(201).json(integration);
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// Update integration
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verify integration belongs to firm's client
    const integration = await prisma.integration.findUnique({
      where: { id },
      include: {
        client: true
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (integration.client.lawFirmId !== req.user!.lawFirmId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.integration.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// Test integration connection
router.post('/:id/test', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const integration = await prisma.integration.findUnique({
      where: { id },
      include: {
        client: true
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (integration.client.lawFirmId !== req.user!.lawFirmId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let success = false;
    let message = '';

    if (integration.type === 'RENTMANAGER_API') {
      const { RentManagerService } = await import('../services/integrations/rentManagerService');
      const rmService = new RentManagerService(
        integration.apiKey || '',
        integration.apiUrl || undefined
      );
      success = await rmService.testConnection();
      message = success ? 'Connection successful' : 'Connection failed';
    } else if (integration.type === 'YARDI_SFTP') {
      const { YardiService } = await import('../services/integrations/yardiService');
      const yardiService = new YardiService({
        host: integration.sftpHost || '',
        port: integration.sftpPort || 22,
        username: integration.sftpUser || '',
        password: integration.sftpPassword || '',
        remotePath: integration.sftpPath || '/'
      });
      success = await yardiService.testConnection();
      message = success ? 'SFTP connection successful' : 'SFTP connection failed';
    } else {
      message = 'Connection test not yet implemented for this integration type';
    }

    res.json({
      success,
      message,
      integrationType: integration.type
    });
  } catch (error: any) {
    console.error('Test integration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test integration',
      message: error.message
    });
  }
});

// Trigger manual sync
router.post('/:id/sync', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const integration = await prisma.integration.findUnique({
      where: { id },
      include: {
        client: true
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (integration.client.lawFirmId !== req.user!.lawFirmId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Import sync service
    const { SyncService } = await import('../services/syncService');
    
    // Run sync in background (don't await)
    SyncService.syncClientIntegration(id).catch(error => {
      console.error('Sync error:', error);
    });

    res.json({
      message: 'Sync initiated',
      integrationId: id
    });
  } catch (error) {
    console.error('Sync integration error:', error);
    res.status(500).json({ error: 'Failed to initiate sync' });
  }
});

export { router as integrationRoutes };

