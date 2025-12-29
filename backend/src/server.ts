import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { caseRoutes } from './routes/cases';
import { clientRoutes } from './routes/clients';
import { documentRoutes } from './routes/documents';
import { propertyRoutes } from './routes/properties';
import { reportRoutes } from './routes/reports';
import { userRoutes } from './routes/users';
import { integrationRoutes } from './routes/integrations';
import { commentRoutes } from './routes/comments';
import { templateRoutes } from './routes/templates';
import { eventRoutes } from './routes/events';
import { settingsRoutes } from './routes/settings';
import { efilingRoutes } from './routes/efiling';
import { bulkRoutes } from './routes/bulk';
import { documentApprovalRoutes } from './routes/documentApproval';
import { courtConfigRoutes } from './routes/courtConfig';
import { efilingStatusRoutes } from './routes/efilingStatus';
import { initializeScheduledReports } from './services/scheduledReports';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/efiling', efilingRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/approvals', documentApprovalRoutes);
app.use('/api/courts', courtConfigRoutes);
app.use('/api/efiling-status', efilingStatusRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 PropertiLaw Backend running on port ${PORT}`);
  
  // Initialize scheduled reports
  if (process.env.NODE_ENV === 'production') {
    initializeScheduledReports();
  }
});

