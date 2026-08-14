import { ApiProperty } from '@nestjs/swagger';

export class PeriodDto {
  @ApiProperty({ description: 'Type of period requested' })
  type: string;

  @ApiProperty({ description: 'Start date of the analyzed period (YYYY-MM-DD)' })
  start_date: string;

  @ApiProperty({ description: 'End date of the analyzed period (YYYY-MM-DD)' })
  end_date: string;
}

export class SalesSummaryDto {
  @ApiProperty({ description: 'Total omzet dari transaksi LUNAS' })
  total_revenue: number;

  @ApiProperty({ description: 'Total jumlah transaksi LUNAS' })
  total_transactions: number;

  @ApiProperty({ description: 'Total item terjual dari transaksi LUNAS' })
  total_items_sold: number;

  @ApiProperty({ description: 'Rata-rata nilai per transaksi' })
  average_transaction: number;

  @ApiProperty({ description: 'Total harga modal dari semua item terjual' })
  total_cost: number;

  @ApiProperty({ description: 'Laba kotor (Total Revenue - Total Cost)' })
  gross_profit: number;

  @ApiProperty({ description: 'Persentase margin laba' })
  profit_margin: number;

  @ApiProperty({ description: 'Total pengeluaran tercatat dari transaksi_keuangan' })
  total_expense: number;

  @ApiProperty({ description: 'Laba bersih (Gross Profit - Total Expense)' })
  net_profit: number;
}

export class SalesChartItemDto {
  @ApiProperty({ description: 'Tanggal atau bulan' })
  date: string;

  @ApiProperty({ description: 'Jumlah transaksi pada tanggal ini' })
  transaction_count: number;

  @ApiProperty({ description: 'Total omzet pada tanggal ini' })
  revenue: number;
}

export class TopProductDto {
  @ApiProperty({ description: 'Ranking berdasarkan kriteria' })
  ranking: number;

  @ApiProperty({ description: 'ID Menu' })
  id: number;

  @ApiProperty({ description: 'Nama Menu' })
  name: string;

  @ApiProperty({ description: 'Kategori Menu' })
  category: string;

  @ApiProperty({ description: 'Total kuantitas terjual' })
  quantity: number;

  @ApiProperty({ description: 'Total omzet dihasilkan produk ini' })
  revenue: number;

  @ApiProperty({ description: 'Total modal dihabiskan produk ini' })
  cost: number;

  @ApiProperty({ description: 'Total laba dihasilkan produk ini' })
  profit: number;
}

export class PaymentMethodAnalysisDto {
  @ApiProperty({ description: 'Jumlah transaksi untuk metode ini' })
  transaction_count: number;

  @ApiProperty({ description: 'Total nilai transaksi untuk metode ini' })
  total_amount: number;
}

export class PaymentMethodsDto {
  @ApiProperty({ type: PaymentMethodAnalysisDto })
  tunai: PaymentMethodAnalysisDto;

  @ApiProperty({ type: PaymentMethodAnalysisDto })
  qris: PaymentMethodAnalysisDto;

  @ApiProperty({ type: PaymentMethodAnalysisDto })
  transfer: PaymentMethodAnalysisDto;
}

export class DebtSummaryDto {
  @ApiProperty({ description: 'Total akumulasi hutang baru di periode ini' })
  total_debt: number;

  @ApiProperty({ description: 'Total pembayaran hutang masuk di periode ini' })
  total_paid: number;

  @ApiProperty({ description: 'Total sisa hutang dari hutang yang terjadi di periode ini' })
  total_remaining: number;
}

export class SalesAnalysisResponseDto {
  @ApiProperty({ type: PeriodDto })
  period: PeriodDto;

  @ApiProperty({ type: SalesSummaryDto })
  summary: SalesSummaryDto;

  @ApiProperty({ type: [SalesChartItemDto] })
  sales_chart: SalesChartItemDto[];

  @ApiProperty({ type: [TopProductDto] })
  top_products: TopProductDto[];

  @ApiProperty({ type: PaymentMethodsDto })
  payment_methods: PaymentMethodsDto;

  @ApiProperty({ type: DebtSummaryDto })
  debt_summary: DebtSummaryDto;
}
