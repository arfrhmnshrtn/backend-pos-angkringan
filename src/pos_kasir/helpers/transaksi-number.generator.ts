import { PrismaService } from '../../prisma/prisma.service.js';

export async function generateTransaksiNumber(prisma: PrismaService): Promise<string> {
  const latestTransaksi = await prisma.transaksi_keuangan.findFirst({
    where: {
      nomor_transaksi: {
        startsWith: 'TRX-',
      },
    },
    orderBy: {
      id: 'desc',
    },
  });

  if (!latestTransaksi) {
    return 'TRX-000001';
  }

  const currentNumberStr = latestTransaksi.nomor_transaksi.replace('TRX-', '');
  const currentNumber = parseInt(currentNumberStr, 10);
  
  if (isNaN(currentNumber)) {
    return 'TRX-000001';
  }

  const nextNumber = currentNumber + 1;
  const nextNumberStr = nextNumber.toString().padStart(6, '0');
  
  return `TRX-${nextNumberStr}`;
}
