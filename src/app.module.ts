import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KatalogModule } from './katalog/katalog.module';
import { PrismaModule } from './prisma/prisma.module';
import { PosKasirModule } from './pos_kasir/pos_kasir.module';

@Module({
  imports: [PrismaModule, KatalogModule, PosKasirModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
