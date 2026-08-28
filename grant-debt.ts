import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const KASIR_PERMS = [
  'dashboard.read',
  'transaction.read',
  'transaction.create',
  'product.read',
  'customer.read',
  'debt.read',
  'debt.create',
  'debt.update',
  'debt.cancel',
  'debt.payment',
];

async function main() {
  console.log('Starting permission sync...');
  const permissions = await prisma.permission.findMany({
    where: { name: { in: KASIR_PERMS } },
  });

  const kasirs = await prisma.user.findMany({
    where: { role: 'KASIR', deleted_at: null }
  });

  console.log(`Giving ${permissions.length} permissions to ${kasirs.length} kasirs...`);

  for (const kasir of kasirs) {
    for (const perm of permissions) {
       // Check if exists
       const exists = await prisma.user_permission.findUnique({
          where: {
            user_permission_unique: {
              user_id: kasir.id,
              permission_id: perm.id
            }
          }
       });
       if (!exists) {
          await prisma.user_permission.create({
            data: { user_id: kasir.id, permission_id: perm.id },
          });
       }
    }
  }
  console.log('✅ Done!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
