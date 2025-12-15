import { PrismaClient } from '@prisma/client';
import { seedCategories } from './seed/categories.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting seed...');

  try {
    await seedCategories(prisma);
    console.log('✨ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
