import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateDebtDto,
  UpdateDebtDto,
  CreateDebtPaymentDto,
  GetDebtsFilterDto,
  ConvertTransactionDto,
} from '../dto/debt.dto.js';
import { Prisma, debt_status, debt_type, jenis_transaksi } from '@prisma/client';
import { generatePagination, getPaginationParams } from '../../pos_kasir/helpers/pagination.helper.js';

@Injectable()
export class DebtService {
  private readonly logger = new Logger(DebtService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createDebt(createDto: CreateDebtDto, userId: number) {
    const { type, total_amount, customer_name, supplier_name, note } = createDto;

    const debt = await this.prisma.debt.create({
      data: {
        type,
        customer_name,
        supplier_name,
        note,
        total_amount,
        paid_amount: 0,
        remaining_amount: total_amount,
        status: 'BELUM_LUNAS',
        created_by: userId,
      },
    });

    return {
      success: true,
      message: 'Hutang/Piutang berhasil dibuat',
      data: debt,
    };
  }

  async findAll(filter: GetDebtsFilterDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.debtWhereInput = {};

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.search) {
      where.OR = [
        { customer_name: { contains: filter.search, mode: 'insensitive' } },
        { supplier_name: { contains: filter.search, mode: 'insensitive' } },
        { note: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.debt.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, fullname: true } },
          pesanan: { select: { id: true, nomor_pesanan: true, status: true } },
        },
      }),
      this.prisma.debt.count({ where }),
    ]);

    return {
      success: true,
      message: 'Daftar hutang berhasil diambil',
      ...generatePagination(data, total, page, limit),
    };
  }

  async findOne(id: number) {
    const debt = await this.prisma.debt.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullname: true } },
        pesanan: true,
        payments: {
          orderBy: { paid_at: 'desc' },
          include: {
            user: { select: { id: true, fullname: true } },
            transaksi_keuangan: true,
          }
        },
      },
    });

    if (!debt) {
      throw new NotFoundException('Data hutang tidak ditemukan');
    }

    return {
      success: true,
      message: 'Detail hutang berhasil diambil',
      data: debt,
    };
  }

  async updateDebt(id: number, updateDto: UpdateDebtDto) {
    const debt = await this.prisma.debt.findUnique({ where: { id } });
    if (!debt) {
      throw new NotFoundException('Data hutang tidak ditemukan');
    }

    const updated = await this.prisma.debt.update({
      where: { id },
      data: updateDto,
    });

    return {
      success: true,
      message: 'Data hutang berhasil diperbarui',
      data: updated,
    };
  }

  async cancelDebt(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findUnique({ where: { id } });
      if (!debt) {
        throw new NotFoundException('Data hutang tidak ditemukan');
      }

      if (debt.status === 'LUNAS') {
        throw new BadRequestException('Hutang yang sudah lunas tidak dapat dibatalkan');
      }

      const updated = await tx.debt.update({
        where: { id },
        data: { status: 'DIBATALKAN' },
      });
      
      if (debt.id_pesanan) {
        await tx.pesanan.update({
          where: { id: debt.id_pesanan },
          data: { status: 'belum_bayar' }
        });
      }
      
      // We don't delete payments or financial records to keep historical consistency by default.
      
      return {
        success: true,
        message: 'Hutang berhasil dibatalkan',
        data: updated,
      };
    });
  }

  async createPayment(id: number, paymentDto: CreateDebtPaymentDto, userId: number) {
    const { amount, payment_method } = paymentDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Ambil debt with row level lock for consistency (if prisma supports it easily, we just rely on transaction for now)
      const debt = await tx.debt.findUnique({ where: { id } });

      if (!debt) {
        throw new NotFoundException('Data hutang tidak ditemukan');
      }

      // 2. Validasi status
      if (debt.status === 'LUNAS') {
        throw new BadRequestException('Hutang ini sudah lunas, tidak dapat melakukan pembayaran');
      }
      if (debt.status === 'DIBATALKAN') {
        throw new BadRequestException('Hutang ini sudah dibatalkan, tidak dapat melakukan pembayaran');
      }

      // 3. Validasi amount
      if (amount <= 0) {
        throw new BadRequestException('Jumlah pembayaran harus lebih dari 0');
      }
      if (amount > debt.remaining_amount) {
        throw new BadRequestException(`Jumlah pembayaran melebihi sisa hutang (Sisa: ${debt.remaining_amount})`);
      }

      // 4. Hitung remaining & status
      const new_paid = debt.paid_amount + amount;
      const new_remaining = debt.total_amount - new_paid;
      let new_status: debt_status = 'SEBAGIAN';
      
      if (new_remaining === 0) {
        new_status = 'LUNAS';
      }

      // 5. Update debt
      const updatedDebt = await tx.debt.update({
        where: { id },
        data: {
          paid_amount: new_paid,
          remaining_amount: new_remaining,
          status: new_status,
        },
      });

      if (debt.id_pesanan) {
        let pesananStatus: 'belum_bayar' | 'lunas' | 'hutang' = 'hutang';
        if (new_status === 'LUNAS') {
          pesananStatus = 'lunas';
        }
        await tx.pesanan.update({
          where: { id: debt.id_pesanan },
          data: { status: pesananStatus },
        });
      }

      // 6. Buat financial record depending on debt type
      const jenisTrans = debt.type === 'CUSTOMER' ? 'pemasukan' : 'pengeluaran';
      const categoryName = debt.type === 'CUSTOMER' ? 'Pembayaran Piutang' : 'Pembayaran Utang';
      
      // Look up or create category
      let kategori = await tx.kategori_keuangan.findUnique({
        where: { nama: categoryName },
      });

      if (!kategori) {
        kategori = await tx.kategori_keuangan.create({
          data: {
            nama: categoryName,
            jenis: jenisTrans,
          },
        });
      }

      // Generate trans number
      // We will just do a simple fallback or call to standard generator if it gets complicated,
      // but for simplicity inside tx: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      // So it strictly scales.
      const date = new Date();
      const uniqueSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const nomor_transaksi = `TRX-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${uniqueSuffix}`;

      const transDesc = debt.type === 'CUSTOMER' 
        ? `Pembayaran piutang pelanggan: ${debt.customer_name || debt.id}` 
        : `Pembayaran utang supplier: ${debt.supplier_name || debt.id}`;

      // Buat transaksi keuangan
      const transaksi = await tx.transaksi_keuangan.create({
        data: {
          nomor_transaksi,
          jenis: jenisTrans,
          id_kategori: kategori.id,
          nominal: amount,
          metode_pembayaran: payment_method,
          keterangan: transDesc,
          id_user: userId,
          id_pesanan: debt.id_pesanan,
        },
      });

      // 7. Buat payment
      const payment = await tx.debt_payment.create({
        data: {
          id_debt: debt.id,
          amount,
          payment_method,
          id_user: userId,
          id_transaksi_keuangan: transaksi.id,
        },
      });

      return {
        success: true,
        message: 'Pembayaran hutang berhasil dicatat',
        data: {
          payment,
          debt: updatedDebt,
        },
      };
    });
  }

  async getPayments(id: number) {
    const debt = await this.prisma.debt.findUnique({ where: { id } });
    if (!debt) {
      throw new NotFoundException('Data hutang tidak ditemukan');
    }

    const payments = await this.prisma.debt_payment.findMany({
      where: { id_debt: id },
      orderBy: { paid_at: 'desc' },
      include: {
        user: { select: { id: true, fullname: true } },
        transaksi_keuangan: true,
      },
    });

    return {
      success: true,
      message: 'Riwayat pembayaran berhasil diambil',
      data: payments,
    };
  }

  async convertTransactionToDebt(id_pesanan: number, convertDto: ConvertTransactionDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Pastikan transaction valid
      const pesanan = await tx.pesanan.findUnique({ where: { id: id_pesanan } });
      
      if (!pesanan) {
        throw new NotFoundException('Pesanan tidak ditemukan');
      }

      // Pastikan belum menjadi debt
      const existingDebt = await tx.debt.findUnique({ where: { id_pesanan } });
      if (existingDebt) {
        throw new ConflictException('Transaksi ini sudah memiliki pencatatan hutang.');
      }

      // Pastikan belum lunas di pesanan (jika diperlukan)
      if (pesanan.status === 'lunas') {
        throw new ConflictException('Transaksi yang sudah lunas tidak dapat diubah menjadi hutang.');
      }

      const totalAmount = pesanan.total_harga;
      const initial_payment = convertDto.initial_payment_amount || 0;

      if (initial_payment > totalAmount) {
        throw new BadRequestException('Pembayaran awal tidak boleh melebihi total pesanan');
      }

      const remainingAmount = totalAmount - initial_payment;
      let status: debt_status = initial_payment === 0 ? 'BELUM_LUNAS' : 'SEBAGIAN';
      
      if (remainingAmount === 0) {
        // Technically not a debt area anymore if fully paid, but allowed by constraints if they literally just match.
        status = 'LUNAS'; 
      }

      // Buat Debt
      const debt = await tx.debt.create({
        data: {
          type: 'CUSTOMER',
          customer_name: convertDto.customer_name || pesanan.nama_pelanggan,
          note: convertDto.note || 'Konversi dari Transaksi POS',
          total_amount: totalAmount,
          paid_amount: 0, // initially 0, we'll increment right after using our standard method or raw update if we want to bypass logic
          remaining_amount: totalAmount,
          status: 'BELUM_LUNAS',
          id_pesanan: pesanan.id,
          created_by: userId,
        },
      });

      // Update Pesanan menjadi hutang atau lunas
      await tx.pesanan.update({
        where: { id: id_pesanan },
        data: {
          status: status === 'LUNAS' ? 'lunas' : 'hutang',
        }
      });

      let finalDebt = debt;
      
      // Jika ada pembayaran awal, gunakan core logic yang sama dengan createPayment secara aman
      if (initial_payment > 0) {
        if (!convertDto.payment_method) {
          throw new BadRequestException('Metode pembayaran wajib diisi jika ada pembayaran awal');
        }
        
        const new_paid = initial_payment;
        const new_remaining = remainingAmount;
        
        finalDebt = await tx.debt.update({
          where: { id: debt.id },
          data: {
            paid_amount: new_paid,
            remaining_amount: new_remaining,
            status: status,
          },
        });

        // Kategori
        let kategori = await tx.kategori_keuangan.findUnique({
          where: { nama: 'Penjualan POS' },
        });

        if (!kategori) {
          kategori = await tx.kategori_keuangan.create({
            data: {
              nama: 'Penjualan POS',
              jenis: 'pemasukan',
            },
          });
        }

        const date = new Date();
        const uniqueSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const nomor_transaksi = `TRX-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${uniqueSuffix}`;

        const transaksi = await tx.transaksi_keuangan.create({
          data: {
            nomor_transaksi,
            jenis: 'pemasukan',
            id_kategori: kategori.id,
            nominal: initial_payment,
            metode_pembayaran: convertDto.payment_method,
            keterangan: `Pembayaran awal pesanan hutang: ${pesanan.nomor_pesanan}`,
            id_user: userId,
            id_pesanan: pesanan.id,
          },
        });

        await tx.debt_payment.create({
          data: {
            id_debt: debt.id,
            amount: initial_payment,
            payment_method: convertDto.payment_method,
            id_user: userId,
            id_transaksi_keuangan: transaksi.id,
          },
        });
      }

      return {
        success: true,
        message: 'Transaksi berhasil diubah menjadi hutang',
        data: finalDebt,
      };
    });
  }

  async getSummary() {
    // Only count non-cancelled
    const totals = await this.prisma.debt.groupBy({
      by: ['type'],
      where: {
        status: { not: 'DIBATALKAN' },
      },
      _sum: {
        total_amount: true,
        paid_amount: true,
        remaining_amount: true,
      },
    });

    const summaryData = {
      totalReceivable: 0,
      totalReceivablePaid: 0,
      totalReceivableRemaining: 0,
      totalPayable: 0,
      totalPayablePaid: 0,
      totalPayableRemaining: 0,
    };

    for (const group of totals) {
      if (group.type === 'CUSTOMER') {
        summaryData.totalReceivable = group._sum.total_amount || 0;
        summaryData.totalReceivablePaid = group._sum.paid_amount || 0;
        summaryData.totalReceivableRemaining = group._sum.remaining_amount || 0;
      } else if (group.type === 'SUPPLIER') {
        summaryData.totalPayable = group._sum.total_amount || 0;
        summaryData.totalPayablePaid = group._sum.paid_amount || 0;
        summaryData.totalPayableRemaining = group._sum.remaining_amount || 0;
      }
    }

    return {
      success: true,
      message: 'Ringkasan hutang berhasil diambil',
      data: summaryData,
    };
  }
}
