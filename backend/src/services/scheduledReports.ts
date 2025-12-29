import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notificationService';
import * as cron from 'node-cron';

const prisma = new PrismaClient();
const notificationService = new NotificationService();

/**
 * Scheduled Reports Service
 * Handles automated report generation and email delivery
 */

interface ScheduledReport {
  id: string;
  name: string;
  schedule: string; // Cron expression
  recipients: string[];
  reportType: 'dashboard' | 'case-volume' | 'timeline-metrics';
  enabled: boolean;
}

/**
 * Generate and send scheduled report
 */
async function generateAndSendReport(report: ScheduledReport) {
  try {
    let reportData: any = {};
    let reportHtml = '';

    // Generate report based on type
    switch (report.reportType) {
      case 'dashboard':
        const dashboardData = await prisma.case.groupBy({
          by: ['status'],
          _count: {
            id: true
          }
        });
        reportData = dashboardData;
        reportHtml = `
          <h2>Dashboard Report</h2>
          <table>
            <tr><th>Status</th><th>Count</th></tr>
            ${dashboardData.map(item => `
              <tr>
                <td>${item.status}</td>
                <td>${item._count.id}</td>
              </tr>
            `).join('')}
          </table>
        `;
        break;

      case 'case-volume':
        const volumeData = await prisma.case.groupBy({
          by: ['clientId'],
          _count: {
            id: true
          },
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        });
        reportData = volumeData;
        reportHtml = `
          <h2>Case Volume Report (Last 30 Days)</h2>
          <p>Total cases: ${volumeData.reduce((sum, item) => sum + item._count.id, 0)}</p>
        `;
        break;

      case 'timeline-metrics':
        const closedCases = await prisma.case.findMany({
          where: {
            status: 'CLOSED',
            closedDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          select: {
            filedDate: true,
            closedDate: true
          }
        });

        const avgDays = closedCases
          .filter(c => c.filedDate && c.closedDate)
          .map(c => {
            const days = Math.floor(
              (c.closedDate!.getTime() - c.filedDate!.getTime()) / (1000 * 60 * 60 * 24)
            );
            return days;
          })
          .reduce((sum, days, _, arr) => sum + days / arr.length, 0);

        reportData = { avgDays };
        reportHtml = `
          <h2>Timeline Metrics Report</h2>
          <p>Average days to close: ${Math.round(avgDays)}</p>
          <p>Cases analyzed: ${closedCases.length}</p>
        `;
        break;
    }

    // Send email to recipients
    for (const recipient of report.recipients) {
      await notificationService.sendEmail(
        recipient,
        `Scheduled Report: ${report.name}`,
        reportHtml
      );
    }

    console.log(`Scheduled report "${report.name}" sent successfully`);
  } catch (error) {
    console.error(`Error generating scheduled report "${report.name}":`, error);
  }
}

/**
 * Initialize scheduled reports
 */
export function initializeScheduledReports() {
  // This would typically load from database
  // For now, using example schedules

  // Daily dashboard report at 8 AM
  cron.schedule('0 8 * * *', async () => {
    const reports = await prisma.firmSettings.findMany({
      where: {
        defaultNotificationEmail: { not: null }
      },
      include: {
        lawFirm: {
          include: {
            users: {
              where: {
                role: 'LAW_FIRM_ADMIN',
                isActive: true
              }
            }
          }
        }
      }
    });

    for (const settings of reports) {
      if (settings.defaultNotificationEmail) {
        await generateAndSendReport({
          id: settings.id,
          name: 'Daily Dashboard',
          schedule: '0 8 * * *',
          recipients: [settings.defaultNotificationEmail],
          reportType: 'dashboard',
          enabled: true
        });
      }
    }
  });

  // Weekly case volume report on Mondays at 9 AM
  cron.schedule('0 9 * * 1', async () => {
    // Similar implementation for weekly reports
    console.log('Weekly case volume report scheduled');
  });

  console.log('Scheduled reports initialized');
  
  // Initialize e-filing polling if in production
  if (process.env.NODE_ENV === 'production') {
    const { EFilingPollingService } = await import('./efilingPolling');
    EFilingPollingService.initializePolling();
  }
}

