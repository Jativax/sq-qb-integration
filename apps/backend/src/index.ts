// Backend application entry point
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import webhookRoutes from './routes/webhooks';
// Import the worker to start background job processing
import './workers/orderWorker';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env['PORT'] || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Square-QuickBooks Integration API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1/webhooks', webhookRoutes);

async function startServer(): Promise<void> {
  try {
    console.log('🚀 SQ-QB Integration Backend starting...');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Log available models
    console.log('📊 Available models:');
    console.log('   - SquareOrder: Store raw Square order data');
    console.log(
      '   - QuickBooksReceipt: Track QB receipts with 1:1 relationship'
    );
    console.log('   - SyncJob: Manage processing jobs');

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`🌐 Server running on http://localhost:${PORT}`);
      console.log(`📋 API Documentation: /api/v1/webhooks/square`);
      console.log('🔄 Background job worker started for order processing');
      console.log('🎯 Ready to process Square to QuickBooks integrations!');
    });
  } catch (error) {
    console.error('❌ Application startup failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch(error => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
