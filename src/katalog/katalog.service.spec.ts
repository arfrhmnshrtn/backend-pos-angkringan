import { Test, TestingModule } from '@nestjs/testing';
import { KatalogService } from './katalog.service';

describe('KatalogService', () => {
  let service: KatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KatalogService],
    }).compile();

    service = module.get<KatalogService>(KatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
