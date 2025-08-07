import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env['PORT'] || '3001', 10);
const HOST = process.env['HOST'] || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Backend API running' });
});

// Minimal API routes for E2E tests
app.post('/api/v1/auth/login', (req, res) => {
  res.json({ token: 'test-token', user: { email: 'test@example.com' } });
});

app.get('/api/v1/jobs', (req, res) => {
  res.json({ jobs: [], totalCount: 0 });
});

app.get('/api/v1/analytics/dashboard', (req, res) => {
  res.json({
    totalOrders: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    pendingJobs: 0,
  });
});

// Webhook endpoint for testing
app.post('/api/v1/webhooks/square', (req, res) => {
  res.status(202).json({
    status: 'accepted',
    message: 'Webhook received and queued for processing',
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Minimal backend running on http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
