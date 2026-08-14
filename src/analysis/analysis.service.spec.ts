import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisPeriod, SalesAnalysisQueryDto } from './dto/sales-analysis-query.dto';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    // Mock the PrismaService
    const mockPrismaService = {
      pesanan: {
        findMany: jest.fn(),
      },
      transaksi_keuangan: {
        aggregate: jest.fn(),
      },
      debt: {
        aggregate: jest.fn(),
      },
      debt_payment: {
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesAnalysis', () => {
    const defaultMocks = () => {
      jest.spyOn(prismaService.pesanan, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.transaksi_keuangan, 'aggregate').mockResolvedValue({ _sum: { nominal: 0 } } as any);
      jest.spyOn(prismaService.debt, 'aggregate').mockResolvedValue({ _sum: { total_amount: 0, remaining_amount: 0 } } as any);
      jest.spyOn(prismaService.debt_payment, 'aggregate').mockResolvedValue({ _sum: { amount: 0 } } as any);
    };

    it('should return default state when there are no transactions', async () => {
      defaultMocks();

      const query: SalesAnalysisQueryDto = {
        period: AnalysisPeriod.LAST_7_DAYS,
      };

      const result = await service.getSalesAnalysis(query);

      expect(result.summary.total_revenue).toBe(0);
      expect(result.summary.total_cost).toBe(0);
      expect(result.summary.gross_profit).toBe(0);
      expect(result.summary.total_expense).toBe(0);
      expect(result.summary.net_profit).toBe(0);
      expect(result.top_products).toEqual([]);
      expect(result.sales_chart).toEqual([]);
    });

    it('should calculate revenue and profit for valid LUNAS order', async () => {
      defaultMocks();

      const mockPesanan: any = [
        {
          id: 1,
          total_harga: 30000,
          metode_pembayaran: 'tunai',
          status: 'lunas',
          created_at: new Date(),
          detail_pesanan: [
            {
              id_menu: 5,
              nama_menu: 'Sate Kulit',
              harga: 3000,
              jumlah: 10,
              subtotal: 30000,
              menu: {
                kategori: 'bakaran',
                harga_modal: 1800,
              }
            }
          ]
        }
      ];

      jest.spyOn(prismaService.pesanan, 'findMany').mockResolvedValue(mockPesanan);
      jest.spyOn(prismaService.transaksi_keuangan, 'aggregate').mockResolvedValue({ _sum: { nominal: 5000 } } as any);

      const query: SalesAnalysisQueryDto = { period: AnalysisPeriod.TODAY };
      const result = await service.getSalesAnalysis(query);

      expect(result.summary.total_revenue).toBe(30000);
      expect(result.summary.total_cost).toBe(18000); // 10 * 1800
      expect(result.summary.gross_profit).toBe(12000); // 30000 - 18000
      expect(result.summary.total_expense).toBe(5000);
      expect(result.summary.net_profit).toBe(7000); // 12000 - 5000
      expect(result.summary.profit_margin).toBe(40); // (12000 / 30000) * 100
      expect(result.top_products[0].name).toBe('Sate Kulit');
      expect(result.top_products[0].profit).toBe(12000);
    });

    it('should throw BadRequestException for invalid custom dates', async () => {
      const query: SalesAnalysisQueryDto = {
        period: AnalysisPeriod.CUSTOM,
        startDate: '2026-08-12',
        endDate: '2026-08-01' // startDate > endDate
      };

      await expect(service.getSalesAnalysis(query)).rejects.toThrow(BadRequestException);
    });

    it('should group payment methods accurately', async () => {
      defaultMocks();

      const mockPesanan: any = [
        { id: 1, total_harga: 10000, metode_pembayaran: 'tunai', status: 'lunas', created_at: new Date(), detail_pesanan: [] },
        { id: 2, total_harga: 15000, metode_pembayaran: 'qris', status: 'lunas', created_at: new Date(), detail_pesanan: [] },
        { id: 3, total_harga: 5000, metode_pembayaran: 'qris', status: 'lunas', created_at: new Date(), detail_pesanan: [] },
      ];

      jest.spyOn(prismaService.pesanan, 'findMany').mockResolvedValue(mockPesanan);

      const result = await service.getSalesAnalysis({ period: AnalysisPeriod.MONTH });
      expect(result.payment_methods.tunai.transaction_count).toBe(1);
      expect(result.payment_methods.tunai.total_amount).toBe(10000);
      expect(result.payment_methods.qris.transaction_count).toBe(2);
      expect(result.payment_methods.qris.total_amount).toBe(20000);
      expect(result.payment_methods.transfer.transaction_count).toBe(0);
    });
  });
});
