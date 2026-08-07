import { Test, TestingModule } from '@nestjs/testing';
import { PosKasirController } from './pos_kasir.controller';
import { PosKasirService } from './pos_kasir.service';

describe('PosKasirController', () => {
  let controller: PosKasirController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PosKasirController],
      providers: [PosKasirService],
    }).compile();

    controller = module.get<PosKasirController>(PosKasirController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
