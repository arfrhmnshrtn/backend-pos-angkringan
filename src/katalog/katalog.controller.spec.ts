import { Test, TestingModule } from '@nestjs/testing';
import { KatalogController } from './katalog.controller';
import { KatalogService } from './katalog.service';

describe('KatalogController', () => {
  let controller: KatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KatalogController],
      providers: [KatalogService],
    }).compile();

    controller = module.get<KatalogController>(KatalogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
