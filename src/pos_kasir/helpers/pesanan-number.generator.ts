import { PrismaService } from '../../prisma/prisma.service.js';

export async function generatePesananNumber(prisma: PrismaService): Promise<string> {
  const latestPesanan = await prisma.pesanan.findFirst({
    orderBy: {
      id: 'desc',
    },
  });

  if (!latestPesanan || !latestPesanan.nomor_pesanan.startsWith('PSN-')) {
    return 'PSN-0001';
  }

  const currentNumberStr = latestPesanan.nomor_pesanan.replace('PSN-', '');
  const currentNumber = parseInt(currentNumberStr, 10);
  
  if (isNaN(currentNumber)) {
    return 'PSN-0001';
  }

  const nextNumber = currentNumber + 1;
  const nextNumberStr = nextNumber.toString().padStart(4, '0');
  
  return `PSN-${nextNumberStr}`;
}
