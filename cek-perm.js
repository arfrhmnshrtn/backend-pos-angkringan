import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const perms = await prisma.permission.findMany();
  console.log(JSON.stringify(perms, null, 2));
}
run();