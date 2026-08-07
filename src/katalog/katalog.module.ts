import { Module } from '@nestjs/common';
import { KatalogService } from './katalog.service';
import { KatalogController } from './katalog.controller';

@Module({
  controllers: [KatalogController],
  providers: [KatalogService],
})
export class KatalogModule {}
