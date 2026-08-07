import { Module } from '@nestjs/common';
import { PosKasirService } from './pos_kasir.service';
import { PosKasirController } from './pos_kasir.controller';

@Module({
  controllers: [PosKasirController],
  providers: [PosKasirService],
  exports: [PosKasirService],
})
export class PosKasirModule {}
