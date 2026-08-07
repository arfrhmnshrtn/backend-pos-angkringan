import { Test, TestingModule } from '@nestjs/testing';
import { PosKasirController } from './pos_kasir.controller';
import { PosKasirService } from './pos_kasir.service';
import { CreatePesananDto } from './dto/create-pesanan.dto';
import { GetPesananFilterDto } from './dto/get-pesanan-filter.dto';
import { UpdatePembayaranDto } from './dto/update-pembayaran.dto';

const mockPosKasirService = {
  createOrder: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  updatePembayaran: jest.fn(),
  remove: jest.fn(),
};

describe('PosKasirController', () => {
  let controller: PosKasirController;
  let service: typeof mockPosKasirService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PosKasirController],
      providers: [
        {
          provide: PosKasirService,
          useValue: mockPosKasirService,
        },
      ],
    }).compile();

    controller = module.get<PosKasirController>(PosKasirController);
    service = module.get(PosKasirService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('harus memanggil service.createOrder dan mengembalikan hasil sesuai', async () => {
      const createDto: CreatePesananDto = { items: [] };
      const expectedResult = { id: 1, nomor_pesanan: 'PSN-0001' };
      service.createOrder.mockResolvedValue(expectedResult as any);

      const result = await controller.create(createDto);

      expect(service.createOrder).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({ data: expectedResult });
    });
  });

  describe('findAll', () => {
    it('harus memanggil service.findAll dan mengembalikan data paginasi', async () => {
      const filterDto: GetPesananFilterDto = { page: 1, limit: 10 };
      const expectedResult = { data: [], meta: { total: 0 } };
      service.findAll.mockResolvedValue(expectedResult as any);

      const result = await controller.findAll(filterDto);

      expect(service.findAll).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('harus memanggil service.findOne dengan ID yang benar', async () => {
      const id = 1;
      const expectedResult = { id, nomor_pesanan: 'PSN-0001' };
      service.findOne.mockResolvedValue(expectedResult as any);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual({ data: expectedResult });
    });
  });

  describe('updatePembayaran', () => {
    it('harus memanggil service.updatePembayaran', async () => {
      const id = 1;
      const updateDto: UpdatePembayaranDto = {
        metode_pembayaran: 'tunai',
        status: 'lunas',
      };
      const expectedResult = { id, status: 'lunas' };
      service.updatePembayaran.mockResolvedValue(expectedResult as any);

      const result = await controller.updatePembayaran(id, updateDto);

      expect(service.updatePembayaran).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual({ data: expectedResult });
    });
  });

  describe('remove', () => {
    it('harus memanggil service.remove dan mengembalikan message', async () => {
      const id = 1;
      const expectedResult = { message: 'Berhasil' };
      service.remove.mockResolvedValue(expectedResult as any);

      const result = await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });
});
