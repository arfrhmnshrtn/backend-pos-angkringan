import { Test, TestingModule } from '@nestjs/testing';
import { PosKasirService } from './pos_kasir.service';

describe('PosKasirService', () => {
  let service: PosKasirService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PosKasirService],
    }).compile();

    service = module.get<PosKasirService>(PosKasirService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
