import { Module } from '@nestjs/common';
import { PosKasirService } from './pos_kasir.service';
import { PosKasirController } from './pos_kasir.controller';

@Module({
  controllers: [PosKasirController],
  providers: [PosKasirService],
})
export class PosKasirModule {}
