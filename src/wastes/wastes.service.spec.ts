import { Test, TestingModule } from '@nestjs/testing';
import { WastesService } from './wastes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { waste_type, waste_reason, stock_movement_type } from '@prisma/client';

describe('WastesService', () => {
  let service: WastesService;
  let prisma: PrismaService;

  const mockPrisma = {
    $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    waste: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    stock_movement: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    katalog_menu: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ingredient: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pesanan: {
      aggregate: jest.fn(),
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WastesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WastesService>(WastesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create waste', () => {
    it('harus berhasil mencatat waste dan mengurangi stok (PRODUCT)', async () => {
      mockPrisma.katalog_menu.findUnique.mockResolvedValue({ id: 1, stok: 10, harga_modal: 5000 });
      mockPrisma.waste.create.mockResolvedValue({ id: 1, type: 'PRODUCT' });
      mockPrisma.stock_movement.create.mockResolvedValue({ id: 1 });

      const dto = { type: waste_type.PRODUCT, item_id: 1, quantity: 2, reason: waste_reason.BASI };
      const res = await service.create(dto, 1);

      expect(res.message).toBe('Barang terbuang berhasil dicatat');
      expect(mockPrisma.katalog_menu.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stok: 8 }
      });
      expect(mockPrisma.waste.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          quantity: 2,
          total_loss: 10000
        })
      }));
    });

    it('gagal jika stok tidak mencukupi', async () => {
      mockPrisma.katalog_menu.findUnique.mockResolvedValue({ id: 1, stok: 1, harga_modal: 5000 });
      const dto = { type: waste_type.PRODUCT, item_id: 1, quantity: 2, reason: waste_reason.BASI };
      
      await expect(service.create(dto, 1)).rejects.toThrow(BadRequestException);
    });

    it('gagal jika item tidak ditemukan', async () => {
      mockPrisma.katalog_menu.findUnique.mockResolvedValue(null);
      const dto = { type: waste_type.PRODUCT, item_id: 1, quantity: 2, reason: waste_reason.BASI };
      
      await expect(service.create(dto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update waste', () => {
    it('mengubah stok jika quantity di-update', async () => {
      mockPrisma.waste.findUnique.mockResolvedValue({
        id: 1, quantity: 5, type: 'PRODUCT', id_katalog_menu: 1, cost_per_unit: 1000
      });
      mockPrisma.katalog_menu.findUnique.mockResolvedValue({ id: 1, stok: 10 });
      mockPrisma.waste.update.mockResolvedValue({ id: 1, quantity: 2 });
      
      const res = await service.update(1, { quantity: 2 }, 1);
      
      // change is 5 -> 2, delta is -3 (we return 3 to stock).
      // wait, newQuantity - oldQuantity = 2 - 5 = -3.
      // logic in service: difference = -3. stock_after = stock_before - difference = 10 - (-3) = 13
      expect(mockPrisma.katalog_menu.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stok: 13 }
      });
      expect(res.message).toBe('Barang terbuang berhasil diperbarui');
    });
  });

  describe('delete waste', () => {
    it('mengembalikan stok saat didelete', async () => {
      mockPrisma.waste.findUnique.mockResolvedValue({
        id: 1, type: 'INGREDIENT', id_ingredient: 2, quantity: 5
      });
      mockPrisma.ingredient.findUnique.mockResolvedValue({ id: 2, stock: 10 });
      
      await service.remove(1, 1);
      
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { stock: 15 }
      });
      expect(mockPrisma.stock_movement.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.waste.delete).toHaveBeenCalled();
    });
  });

  describe('analysis', () => {
    it('menghitung analysis', async () => {
      mockPrisma.waste.aggregate.mockResolvedValue({
        _sum: { total_loss: 50000, quantity: 10 },
        _count: { id: 2 }
      });
      mockPrisma.waste.groupBy.mockResolvedValue([
        { reason: 'BASI', _sum: { quantity: 10, total_loss: 50000 } }
      ]);
      mockPrisma.waste.findMany.mockResolvedValue([]);
      mockPrisma.pesanan.aggregate.mockResolvedValue({ _sum: { total_harga: 1000000 } });

      const res = await service.getAnalysis({});
      expect(res.data.summary.total_loss).toBe(50000);
      expect(res.data.summary.waste_ratio).toBe(5); // 50000 / 1000000 = 5%
    });
  });
});
