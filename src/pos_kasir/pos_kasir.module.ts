import { Module } from '@nestjs/common';
import { PosKasirService } from './services/pos_kasir.service.js';
import { PosKasirController } from './controllers/pos_kasir.controller.js';
import { DashboardService } from './services/dashboard.service.js';
import { DashboardController } from './controllers/dashboard.controller.js';
import { KategoriKeuanganService } from './services/kategori-keuangan.service.js';
import { KategoriKeuanganController } from './controllers/kategori-keuangan.controller.js';
import { TransaksiKeuanganService } from './services/transaksi-keuangan.service.js';
import { TransaksiKeuanganController } from './controllers/transaksi-keuangan.controller.js';
import { LaporanService } from './services/laporan.service.js';
import { LaporanController } from './controllers/laporan.controller.js';

@Module({
  controllers: [
    PosKasirController,
    DashboardController,
    KategoriKeuanganController,
    TransaksiKeuanganController,
    LaporanController,
  ],
  providers: [
    PosKasirService,
    DashboardService,
    KategoriKeuanganService,
    TransaksiKeuanganService,
    LaporanService,
  ],
  exports: [
    PosKasirService,
    DashboardService,
    KategoriKeuanganService,
    TransaksiKeuanganService,
  ],
})
export class PosKasirModule {}
