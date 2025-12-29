import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get events for a case
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

    const events = await prisma.caseEvent.findMany({
      where: { caseId },
      orderBy: {
        eventDate: 'asc'
      }
    });

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get upcoming events/tasks
router.get('/upcoming', async (req: AuthRequest, res) => {
  try {
    const { days = 30 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days as string));

    const where: any = {
      dueDate: {
        lte: futureDate,
        gte: new Date()
      },
      isCompleted: false
    };

    // Client users can only see their own cases' events
    if (req.user?.userType === 'client') {
      const cases = await prisma.case.findMany({
        where: { clientId: req.user.clientId },
        select: { id: true }
      });
      where.caseId = { in: cases.map(c => c.id) };
    }

    const events = await prisma.caseEvent.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            property: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    res.json(events);
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Create event
router.post('/', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const {
      caseId,
      eventType,
      title,
      description,
      eventDate,
      dueDate
    } = req.body;

    if (!caseId || !eventType || !title) {
      return res.status(400).json({ error: 'Case ID, event type, and title are required' });
    }

    const event = await prisma.caseEvent.create({
      data: {
        caseId,
        eventType,
        title,
        description,
        eventDate: eventDate ? new Date(eventDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        isCompleted: false
      }
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.eventDate) updateData.eventDate = new Date(updateData.eventDate);
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);

    const event = await prisma.caseEvent.update({
      where: { id },
      data: updateData
    });

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Mark event as completed
router.patch('/:id/complete', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.caseEvent.update({
      where: { id },
      data: {
        isCompleted: true,
        eventDate: new Date()
      }
    });

    res.json(event);
  } catch (error) {
    console.error('Complete event error:', error);
    res.status(500).json({ error: 'Failed to complete event' });
  }
});

// Delete event
router.delete('/:id', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.caseEvent.delete({
      where: { id }
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export { router as eventRoutes };

