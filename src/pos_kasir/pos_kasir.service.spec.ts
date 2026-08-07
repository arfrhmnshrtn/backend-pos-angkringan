import { Test, TestingModule } from '@nestjs/testing';
import { PosKasirService } from './pos_kasir.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePesananDto } from './dto/create-pesanan.dto';
import { UpdatePembayaranDto } from './dto/update-pembayaran.dto';

const mockPrismaService = {
  $transaction: jest.fn(),
  pesanan: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
};

describe('PosKasirService', () => {
  let service: PosKasirService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosKasirService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PosKasirService>(PosKasirService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('harus mengembalikan pesanan jika ID ditemukan', async () => {
      const mockResult = { id: 1, nomor_pesanan: 'PSN-0001' };
      prisma.pesanan.findUnique.mockResolvedValue(mockResult);

      const result = await service.findOne(1);
      expect(result).toEqual(mockResult);
      expect(prisma.pesanan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { detail_pesanan: true },
      });
    });

    it('harus melempar NotFoundException jika ID tidak ditemukan', async () => {
      prisma.pesanan.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('harus mengembalikan data paginasi dengan filter pencarian dan status', async () => {
      const filter = { page: 1, limit: 10, search: 'PSN', status: 'lunas' as any };
      const mockData = [{ id: 1 }];
      prisma.pesanan.count = jest.fn().mockReturnValue(1);
      prisma.pesanan.findMany = jest.fn().mockReturnValue(mockData);
      
      // Mock transaksi yang digunakan dalam findAll [count, findMany]
      prisma.$transaction.mockResolvedValue([1, mockData]);

      const result = await service.findAll(filter);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
      expect(result.meta.lastPage).toBe(1);
    });
  });

  describe('updatePembayaran', () => {
    it('harus melempar NotFoundException jika pesanan tidak ada', async () => {
      prisma.pesanan.findUnique.mockResolvedValue(null);
      await expect(service.updatePembayaran(1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('harus mengupdate data status pembayaran', async () => {
      prisma.pesanan.findUnique.mockResolvedValue({ id: 1 });
      
      const updateData: UpdatePembayaranDto = {
        metode_pembayaran: 'tunai',
        status: 'lunas',
      };
      
      const mockUpdated = { id: 1, status: 'lunas' };
      prisma.pesanan.update.mockResolvedValue(mockUpdated);

      const result = await service.updatePembayaran(1, updateData);
      expect(result).toEqual(mockUpdated);
      expect(prisma.pesanan.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
        include: { detail_pesanan: true },
      });
    });
  });

  describe('createOrder', () => {
    it('harus menjalankan $transaction dalam Prisma untuk create pesanan', async () => {
      const dto: CreatePesananDto = {
        nama_pelanggan: 'Budi',
        items: [{ id_menu: 1, jumlah: 2 }],
      };

      const mockTxResult = { id: 10, nomor_pesanan: 'PSN-0001' };
      
      // Kita mock callback transaction agar mengembalikan dummy result, 
      // Karena kita melakukan logic di dalam Prisma Tx callback.
      prisma.$transaction.mockImplementation(async (callback: any) => {
        if (typeof callback === 'function') {
           // Untuk unit test penuh, testing inner tx func biasanya 
           // di-mock lebih detail atau dipisah modul transaksinya.
           // Tapi disini kita asumsikan transaction berjalan aman.
           return mockTxResult;
        }
        return callback;
      });

      const result = await service.createOrder(dto);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockTxResult);
    });
  });

  describe('remove', () => {
    it('harus menghapus data jika ditemukan melalui prisma transaction', async () => {
      // Mock findOne exists
      prisma.pesanan.findUnique.mockResolvedValue({
        id: 1,
        detail_pesanan: [{ id_menu: 1, jumlah: 2 }]
      });

      prisma.$transaction.mockImplementation(async (callback: any) => {
        if (typeof callback === 'function') {
           return true; 
        }
        return callback;
      });

      const result = await service.remove(1);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.message).toContain('berhasil dihapus');
    });

    it('harus melempar err jika pesanan tidak ditemukan dan tidak proceed $transaction', async () => {
      prisma.pesanan.findUnique.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
      // dipastikan $transaction reset mock jadi kita tidak memanggilnya
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
