import { PrismaClient, UserRole } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash passwords using Argon2 for security
  const adminPassword = await argon2.hash('admin123');
  const viewerPassword = await argon2.hash('viewer123');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sqqb.com' },
    update: {},
    create: {
      email: 'admin@sqqb.com',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log('✅ Created admin user:', {
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
  });

  // Create viewer user
  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@sqqb.com' },
    update: {},
    create: {
      email: 'viewer@sqqb.com',
      password: viewerPassword,
      role: UserRole.VIEWER,
    },
  });

  console.log('✅ Created viewer user:', {
    id: viewerUser.id,
    email: viewerUser.email,
    role: viewerUser.role,
  });

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('Admin: admin@sqqb.com / admin123');
  console.log('Viewer: viewer@sqqb.com / viewer123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
