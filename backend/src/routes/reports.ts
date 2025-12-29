import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireFirmUser } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get dashboard stats
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const where: any = {};

    if (req.user?.userType === 'client') {
      where.clientId = req.user.clientId;
    } else if (req.user?.userType === 'firm') {
      if (req.query.clientId) {
        where.clientId = req.query.clientId as string;
      }
    }

    const [
      totalCases,
      openCases,
      filedCases,
      closedCases,
      upcomingHearings
    ] = await Promise.all([
      prisma.case.count({ where }),
      prisma.case.count({ where: { ...where, status: { not: 'CLOSED' } } }),
      prisma.case.count({ where: { ...where, status: { in: ['FILED', 'HEARING_SCHEDULED', 'JUDGMENT'] } } }),
      prisma.case.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.case.count({
        where: {
          ...where,
          hearingDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        }
      })
    ]);

    res.json({
      totalCases,
      openCases,
      filedCases,
      closedCases,
      upcomingHearings
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Case volume report
router.get('/case-volume', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, clientId } = req.query;

    const where: any = {
      lawFirmId: req.user!.lawFirmId
    };

    if (clientId) {
      where.id = clientId;
    }

    const clients = await prisma.propertyMgmtClient.findMany({
      where,
      include: {
        cases: {
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate as string) : undefined,
              lte: endDate ? new Date(endDate as string) : undefined
            }
          },
          select: {
            status: true,
            createdAt: true,
            closedDate: true
          }
        }
      }
    });

    const report = clients.map(client => ({
      clientId: client.id,
      clientName: client.name,
      totalCases: client.cases.length,
      openCases: client.cases.filter(c => c.status !== 'CLOSED').length,
      closedCases: client.cases.filter(c => c.status === 'CLOSED').length
    }));

    res.json(report);
  } catch (error) {
    console.error('Case volume report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Timeline metrics report
router.get('/timeline-metrics', requireFirmUser, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    const closedCases = await prisma.case.findMany({
      where: {
        status: 'CLOSED',
        closedDate: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
        },
        client: {
          lawFirmId: req.user!.lawFirmId
        }
      },
      select: {
        filedDate: true,
        judgmentDate: true,
        closedDate: true
      }
    });

    const metrics = closedCases
      .filter(c => c.filedDate && c.closedDate)
      .map(c => {
        const daysToJudgment = c.judgmentDate && c.filedDate
          ? Math.floor((c.judgmentDate.getTime() - c.filedDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const daysToClose = c.filedDate && c.closedDate
          ? Math.floor((c.closedDate.getTime() - c.filedDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          daysToJudgment,
          daysToClose
        };
      })
      .filter(m => m.daysToClose !== null);

    const avgDaysToJudgment = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + (m.daysToJudgment || 0), 0) / metrics.filter(m => m.daysToJudgment !== null).length
      : 0;

    const avgDaysToClose = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + (m.daysToClose || 0), 0) / metrics.length
      : 0;

    res.json({
      totalCases: closedCases.length,
      avgDaysToJudgment: Math.round(avgDaysToJudgment),
      avgDaysToClose: Math.round(avgDaysToClose),
      minDaysToClose: metrics.length > 0 ? Math.min(...metrics.map(m => m.daysToClose!)) : 0,
      maxDaysToClose: metrics.length > 0 ? Math.max(...metrics.map(m => m.daysToClose!)) : 0
    });
  } catch (error) {
    console.error('Timeline metrics error:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

export { router as reportRoutes };

