import { Test, TestingModule } from '@nestjs/testing';
import { DebtService } from './debt.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { debt_type, debt_status, metode_pembayaran } from '@prisma/client';

describe('DebtService', () => {
  let service: DebtService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtService,
        {
          provide: PrismaService,
          useValue: {
            debt: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              groupBy: jest.fn(),
            },
            debt_payment: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            pesanan: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            transaksi_keuangan: {
              create: jest.fn(),
            },
            kategori_keuangan: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<DebtService>(DebtService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDebt', () => {
    it('should create manual debt', async () => {
      const mockDebt = { id: 1, type: 'CUSTOMER', total_amount: 100000 };
      (prisma.debt.create as jest.Mock).mockResolvedValue(mockDebt);

      const result = await service.createDebt({
        type: 'CUSTOMER' as debt_type,
        total_amount: 100000,
        customer_name: 'Budi'
      }, 1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDebt);
      expect(prisma.debt.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a debt if found', async () => {
      const mockDebt = { id: 1 };
      (prisma.debt.findUnique as jest.Mock).mockResolvedValue(mockDebt);

      const result = await service.findOne(1);
      expect(result.data).toEqual(mockDebt);
    });

    it('should throw NotFoundException if not found', async () => {
      (prisma.debt.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelDebt', () => {
    it('should cancel uncompleted debt', async () => {
      (prisma.debt.findUnique as jest.Mock).mockResolvedValue({ id: 1, status: 'BELUM_LUNAS' });
      (prisma.debt.update as jest.Mock).mockResolvedValue({ id: 1, status: 'DIBATALKAN' });

      const result = await service.cancelDebt(1);
      expect(result.data.status).toBe('DIBATALKAN');
    });

    it('should fail if debt is already paid', async () => {
      (prisma.debt.findUnique as jest.Mock).mockResolvedValue({ id: 1, status: 'LUNAS' });
      await expect(service.cancelDebt(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createPayment', () => {
    it('should record payment and create financial record', async () => {
      (prisma.debt.findUnique as jest.Mock).mockResolvedValue({ 
        id: 1, 
        type: 'CUSTOMER', 
        status: 'BELUM_LUNAS',
        total_amount: 100000,
        paid_amount: 0,
        remaining_amount: 100000
      });
      (prisma.kategori_keuangan.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.transaksi_keuangan.create as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.debt_payment.create as jest.Mock).mockResolvedValue({ id: 1, amount: 50000 });
      (prisma.debt.update as jest.Mock).mockResolvedValue({ id: 1, paid_amount: 50000, remaining_amount: 50000, status: 'SEBAGIAN' });

      const result = await service.createPayment(1, { amount: 50000, payment_method: 'tunai' as metode_pembayaran }, 1);
      
      expect(result.success).toBe(true);
      expect(result.data.payment.amount).toBe(50000);
      expect(prisma.debt.update).toHaveBeenCalledWith(expect.objectContaining({
        data: {
          paid_amount: 50000,
          remaining_amount: 50000,
          status: 'SEBAGIAN'
        }
      }));
    });
  });

  describe('convertTransactionToDebt', () => {
    it('should fail if transaction already converted', async () => {
      (prisma.pesanan.findUnique as jest.Mock).mockResolvedValue({ id: 1, status: 'belum_bayar' });
      (prisma.debt.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

      await expect(service.convertTransactionToDebt(1, {}, 1)).rejects.toThrow(ConflictException);
    });
  });
});
