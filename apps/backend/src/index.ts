// Backend application entry point
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🚀 SQ-QB Integration Backend starting...');

  try {
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

    console.log('🎯 Ready to process Square to QuickBooks integrations!');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
