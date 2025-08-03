// Backend application entry point
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Backend application starting...');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
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
