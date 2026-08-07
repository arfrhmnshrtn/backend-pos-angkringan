import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ALL_PERMISSIONS,
  KASIR_PERMISSIONS,
  BCRYPT_SALT_ROUNDS,
  DEFAULT_OWNER_PIN,
} from '../src/common/constants/index.js';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Starting seeder...');

  // ==================================
  // 1. Seed Permissions
  // ==================================
  console.log('📋 Seeding permissions...');

  for (const permissionName of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permissionName },
      update: {},
      create: { name: permissionName },
    });
  }

  console.log(`✅ ${ALL_PERMISSIONS.length} permissions seeded`);

  // ==================================
  // 2. Seed Role Permissions
  // ==================================
  console.log('🔗 Seeding role permissions...');

  // Get all permissions from DB
  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.name, p.id]));

  // OWNER gets all permissions
  for (const perm of ALL_PERMISSIONS) {
    const permId = permissionMap.get(perm);
    if (permId === undefined) continue;

    await prisma.role_permission.upsert({
      where: {
        role_permission_id: { role: 'OWNER', permission_id: permId },
      },
      update: {},
      create: {
        role: 'OWNER',
        permission_id: permId,
      },
    });
  }

  console.log(`✅ OWNER: ${ALL_PERMISSIONS.length} permissions assigned`);

  // KASIR gets POS permissions only
  for (const perm of KASIR_PERMISSIONS) {
    const permId = permissionMap.get(perm);
    if (permId === undefined) continue;

    await prisma.role_permission.upsert({
      where: {
        role_permission_id: { role: 'KASIR', permission_id: permId },
      },
      update: {},
      create: {
        role: 'KASIR',
        permission_id: permId,
      },
    });
  }

  console.log(`✅ KASIR: ${KASIR_PERMISSIONS.length} permissions assigned`);

  // ==================================
  // 3. Seed Default Owner
  // ==================================
  console.log('👤 Seeding default owner...');

  const existingOwner = await prisma.user.findFirst({
    where: { role: 'OWNER', deleted_at: null },
  });

  if (!existingOwner) {
    const hashedPin = await bcrypt.hash(DEFAULT_OWNER_PIN, BCRYPT_SALT_ROUNDS);

    await prisma.user.create({
      data: {
        fullname: 'Owner',
        pin: hashedPin,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Default owner created (PIN: 1234)');
  } else {
    console.log('⏭️  Owner already exists, skipping');
  }

  console.log('🎉 Seeding completed!');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Seeder failed:', e);
  process.exit(1);
});
