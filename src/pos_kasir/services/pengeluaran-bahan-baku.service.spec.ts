import { Test, TestingModule } from '@nestjs/testing';
import { PengeluaranBahanBakuService } from './pengeluaran-bahan-baku.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BadRequestException } from '@nestjs/common';

// Prisma Mocks
const mockPrismaService = {
  kategori_keuangan: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  pengeluaran_bahan_baku: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  transaksi_keuangan: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  }
};

describe('PengeluaranBahanBakuService', () => {
  let service: PengeluaranBahanBakuService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PengeluaranBahanBakuService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PengeluaranBahanBakuService>(PengeluaranBahanBakuService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();

    // Default mock behavior for category
    prisma.kategori_keuangan.findFirst.mockResolvedValue({ id: 1, nama: 'Bahan Baku' });

    // Mock transaction implementation to just execute the callback
    prisma.$transaction.mockImplementation(async (cb: any) => {
      return cb(prisma); // Pass the mocked prisma as the transaction object
    });
  });

  describe('create()', () => {
    it('1. Item belum ada -> CREATE', async () => {
      prisma.pengeluaran_bahan_baku.findMany.mockResolvedValue([]);
      prisma.transaksi_keuangan.create.mockResolvedValue({ id: 99 });
      prisma.pengeluaran_bahan_baku.create.mockResolvedValue({ id: 1, nama_item: 'Garam' });

      const dto = { item_name: 'Garam', quantity: 2, unit: 'kg', total_price: 5000 };
      await service.create(dto, 1);

      expect(prisma.pengeluaran_bahan_baku.create).toHaveBeenCalled();
      expect(prisma.pengeluaran_bahan_baku.update).not.toHaveBeenCalled();
    });

    it('2. Item sudah ada dengan nama sama -> UPDATE quantity (UPSERT)', async () => {
      prisma.pengeluaran_bahan_baku.findMany.mockResolvedValue([
        { id: 1, nama_item: 'Beras', jumlah: 10, satuan: 'kg', total_harga: 100000, harga_satuan: 10000 }
      ]);
      prisma.transaksi_keuangan.create.mockResolvedValue({ id: 100 });
      prisma.pengeluaran_bahan_baku.update.mockResolvedValue({ id: 1, jumlah: 15 });

      const dto = { item_name: 'Beras', quantity: 5, unit: 'kg', total_price: 50000 };
      await service.create(dto, 1);

      expect(prisma.pengeluaran_bahan_baku.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          jumlah: 15,
          total_harga: 150000,
          id_transaksi_keuangan: 100
        })
      }));
    });

    it('3. Nama berbeda huruf besar/kecil -> dianggap sama (UPSERT)', async () => {
      prisma.pengeluaran_bahan_baku.findMany.mockResolvedValue([
        { id: 1, nama_item: 'bErAs', jumlah: 5, satuan: 'kg', total_harga: 50000, harga_satuan: 10000 }
      ]);
      prisma.transaksi_keuangan.create.mockResolvedValue({ id: 101 });
      
      const dto = { item_name: 'BERAS', quantity: 5, unit: 'kg', total_price: 50000 };
      await service.create(dto, 1);

      expect(prisma.pengeluaran_bahan_baku.update).toHaveBeenCalled();
    });

    it('4. Item sama + unit sama -> quantity dijumlahkan', async () => {
      prisma.pengeluaran_bahan_baku.findMany.mockResolvedValue([
        { id: 1, nama_item: 'Beras', jumlah: 5, satuan: 'KG', total_harga: 50000, harga_satuan: 10000 }
      ]);
      prisma.transaksi_keuangan.create.mockResolvedValue({ id: 102 });

      const dto = { item_name: 'Beras', quantity: 5, unit: 'kg', total_price: 60000 }; 
      await service.create(dto, 1);

      // Quantities summing check
      expect(prisma.pengeluaran_bahan_baku.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ jumlah: 10, total_harga: 110000 })
      }));
    });

    it('5. Item sama + unit berbeda -> Error BadRequest', async () => {
      prisma.pengeluaran_bahan_baku.findMany.mockResolvedValue([
        { id: 1, nama_item: 'Beras', jumlah: 5, satuan: 'LITER', total_harga: 50000 }
      ]);

      const dto = { item_name: 'Beras', quantity: 5, unit: 'KG', total_price: 50000 };
      
      await expect(service.create(dto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto, 1)).rejects.toThrow('Item sudah terdaftar dengan satuan berbeda.');
    });
  });

  describe('update() (Edit Data)', () => {
    it('9. Edit data -> tidak terjadi double accumulation (replace value)', async () => {
      prisma.pengeluaran_bahan_baku.findUnique.mockResolvedValue({
        id: 1, nama_item: 'Beras', jumlah: 15, satuan: 'kg', total_harga: 150000, harga_satuan: 10000, id_transaksi_keuangan: 100
      });
      prisma.pengeluaran_bahan_baku.update.mockResolvedValue(true);

      const updateDto = { item_name: 'Beras', quantity: 20, unit: 'kg', total_price: 200000 };
      await service.update(1, updateDto);

      // Quantity should be exactly 20, not 35
      expect(prisma.pengeluaran_bahan_baku.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ jumlah: 20 })
      }));
    });
  });

  describe('remove() (Delete Data)', () => {
    it('10 & 11. Delete -> transaksi pengeluaran tidak ikut dihapus (Hanya Bahan Baku)', async () => {
      prisma.pengeluaran_bahan_baku.findUnique.mockResolvedValue({
        id: 1, id_transaksi_keuangan: 100
      });
      prisma.pengeluaran_bahan_baku.delete.mockResolvedValue(true);

      await service.remove(1);

      // Pastikan pengeluaran_bahan_baku di delete 
      expect(prisma.pengeluaran_bahan_baku.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      // Pastikan transaksi keuangan TIDAK di delete (history tetep ada)
      expect(prisma.transaksi_keuangan.update).not.toHaveBeenCalled(); // At least no specific delete/update for this logic
    });
  });
});
