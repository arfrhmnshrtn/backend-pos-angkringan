/**
 * Post-seed validators.
 * Runs queries against the database to verify data integrity.
 */
import type { PrismaClient } from '@prisma/client';
import { formatRupiah } from './utils.js';
import { SEED_CONFIG } from './config.js';

interface ValidationResult {
  passed: boolean;
  errors: string[];
}

export async function runValidation(prisma: PrismaClient): Promise<ValidationResult> {
  const errors: string[] = [];

  console.log('\n====================================');
  console.log('🔍 VALIDATING SEED DATA');
  console.log('====================================\n');

  // --- 1. Record Counts ---
  const userCount = await prisma.user.count();
  const menuCount = await prisma.katalog_menu.count();
  const orderCount = await prisma.pesanan.count();
  const detailCount = await prisma.detail_pesanan.count();
  const debtCount = await prisma.debt.count();
  const debtPaymentCount = await prisma.debt_payment.count();
  const transaksiCount = await prisma.transaksi_keuangan.count();
  const wasteCount = await prisma.waste.count();
  const budgetCount = await prisma.budget_allocation.count();
  const ingredientCount = await prisma.ingredient.count();

  console.log('📊 Record Counts:');
  console.log(`  Users:             ${userCount}`);
  console.log(`  Menu Products:     ${menuCount}`);
  console.log(`  Orders:            ${orderCount}`);
  console.log(`  Order Details:     ${detailCount}`);
  console.log(`  Debts:             ${debtCount}`);
  console.log(`  Debt Payments:     ${debtPaymentCount}`);
  console.log(`  Transaksi:         ${transaksiCount}`);
  console.log(`  Waste:             ${wasteCount}`);
  console.log(`  Budget:            ${budgetCount}`);
  console.log(`  Ingredients:       ${ingredientCount}`);

  // Validate order count
  if (orderCount < SEED_CONFIG.ORDERS * 0.99) {
    errors.push(`Order count ${orderCount} is significantly less than target ${SEED_CONFIG.ORDERS}`);
  }

  // --- 2. Orphan checks ---
  const orphanDetails = await prisma.detail_pesanan.count({
    where: { pesanan: { is: null } } as Record<string, unknown>,
  }).catch(() => 0); // If relation filter not supported, skip

  // Check for invalid FK by counting details without matching pesanan
  const detailsWithoutOrder = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM detail_pesanan dp LEFT JOIN pesanan p ON dp.id_pesanan = p.id WHERE p.id IS NULL`
  );
  const orphanDetailCount = Number(detailsWithoutOrder[0]?.count || 0);
  if (orphanDetailCount > 0) {
    errors.push(`${orphanDetailCount} orphan detail_pesanan records found`);
  }

  // Check debt_payment without valid debt
  const orphanPayments = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM debt_payment dp LEFT JOIN debt d ON dp.id_debt = d.id WHERE d.id IS NULL`
  );
  const orphanPaymentCount = Number(orphanPayments[0]?.count || 0);
  if (orphanPaymentCount > 0) {
    errors.push(`${orphanPaymentCount} orphan debt_payment records found`);
  }

  console.log(`\n✅ Orphan Details: ${orphanDetailCount}`);
  console.log(`✅ Orphan Payments: ${orphanPaymentCount}`);

  // --- 3. Financial Validation ---
  // Total revenue from lunas orders
  const revenueResult = await prisma.pesanan.aggregate({
    where: { status: 'lunas' },
    _sum: { total_harga: true },
  });
  const totalRevenue = revenueResult._sum.total_harga || 0;

  // Total income from transaksi_keuangan
  const incomeResult = await prisma.transaksi_keuangan.aggregate({
    where: { jenis: 'pemasukan' },
    _sum: { nominal: true },
  });
  const totalIncome = incomeResult._sum.nominal || 0;

  // Total expenses from transaksi_keuangan
  const expenseResult = await prisma.transaksi_keuangan.aggregate({
    where: { jenis: 'pengeluaran' },
    _sum: { nominal: true },
  });
  const totalExpense = expenseResult._sum.nominal || 0;

  // Debt summary
  const debtSummary = await prisma.debt.aggregate({
    _sum: { total_amount: true, paid_amount: true, remaining_amount: true },
  });
  const totalDebt = debtSummary._sum.total_amount || 0;
  const totalDebtPaid = debtSummary._sum.paid_amount || 0;
  const totalDebtRemaining = debtSummary._sum.remaining_amount || 0;

  // Waste loss
  const wasteLoss = await prisma.waste.aggregate({
    _sum: { total_loss: true },
  });
  const totalWasteLoss = wasteLoss._sum.total_loss || 0;

  console.log('\n💰 Financial Summary:');
  console.log(`  Total Revenue (lunas orders):  ${formatRupiah(totalRevenue)}`);
  console.log(`  Total Income (transaksi):      ${formatRupiah(totalIncome)}`);
  console.log(`  Total Expenses:                ${formatRupiah(totalExpense)}`);
  console.log(`  Net Profit (Revenue-Expense):  ${formatRupiah(totalRevenue - totalExpense)}`);
  console.log(`  Total Debt Created:            ${formatRupiah(totalDebt)}`);
  console.log(`  Total Debt Paid:               ${formatRupiah(totalDebtPaid)}`);
  console.log(`  Total Debt Remaining:          ${formatRupiah(totalDebtRemaining)}`);
  console.log(`  Total Waste Loss:              ${formatRupiah(totalWasteLoss)}`);

  // --- 4. Debt consistency ---
  // remaining = total - paid for non-cancelled debts
  const inconsistentDebts = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM debt WHERE status != 'DIBATALKAN' AND remaining_amount != total_amount - paid_amount`
  );
  const badDebtCount = Number(inconsistentDebts[0]?.count || 0);
  if (badDebtCount > 0) {
    errors.push(`${badDebtCount} debts have inconsistent remaining_amount`);
  }

  // LUNAS debts should have remaining = 0
  const lunasWithRemaining = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM debt WHERE status = 'LUNAS' AND remaining_amount != 0`
  );
  const badLunasCount = Number(lunasWithRemaining[0]?.count || 0);
  if (badLunasCount > 0) {
    errors.push(`${badLunasCount} LUNAS debts have remaining_amount != 0`);
  }

  // BELUM_LUNAS debts should have remaining > 0
  const belumLunasZero = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM debt WHERE status = 'BELUM_LUNAS' AND remaining_amount = 0`
  );
  const badBelumCount = Number(belumLunasZero[0]?.count || 0);
  if (badBelumCount > 0) {
    errors.push(`${badBelumCount} BELUM_LUNAS debts have remaining_amount = 0`);
  }

  console.log(`\n✅ Debt Consistency: ${badDebtCount} inconsistent, ${badLunasCount} bad LUNAS, ${badBelumCount} bad BELUM_LUNAS`);

  // --- 5. Duplicate check ---
  const dupOrders = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM (SELECT nomor_pesanan FROM pesanan GROUP BY nomor_pesanan HAVING COUNT(*) > 1) sub`
  );
  const dupOrderCount = Number(dupOrders[0]?.count || 0);
  if (dupOrderCount > 0) {
    errors.push(`${dupOrderCount} duplicate nomor_pesanan found`);
  }

  const dupTrx = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM (SELECT nomor_transaksi FROM transaksi_keuangan GROUP BY nomor_transaksi HAVING COUNT(*) > 1) sub`
  );
  const dupTrxCount = Number(dupTrx[0]?.count || 0);
  if (dupTrxCount > 0) {
    errors.push(`${dupTrxCount} duplicate nomor_transaksi found`);
  }

  console.log(`✅ Duplicate Orders: ${dupOrderCount}, Duplicate Transaksi: ${dupTrxCount}`);

  // --- 6. Distribution queries ---
  console.log('\n📈 Distribution Analysis:');

  // Orders per status
  const statusDist = await prisma.pesanan.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log('\n  Order Status:');
  for (const s of statusDist) {
    console.log(`    ${s.status}: ${s._count}`);
  }

  // Payment method distribution
  const pmDist = await prisma.pesanan.groupBy({
    by: ['metode_pembayaran'],
    where: { status: 'lunas' },
    _count: true,
  });
  console.log('\n  Payment Methods (lunas):');
  for (const p of pmDist) {
    console.log(`    ${p.metode_pembayaran || 'null'}: ${p._count}`);
  }

  // Debt status distribution
  const debtStatusDist = await prisma.debt.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log('\n  Debt Status:');
  for (const d of debtStatusDist) {
    console.log(`    ${d.status}: ${d._count}`);
  }

  // Top 10 products
  const topProducts = await prisma.detail_pesanan.groupBy({
    by: ['nama_menu'],
    _sum: { jumlah: true },
    orderBy: { _sum: { jumlah: 'desc' } },
    take: 10,
  });
  console.log('\n  Top 10 Products:');
  for (let i = 0; i < topProducts.length; i++) {
    console.log(`    #${i + 1} ${topProducts[i].nama_menu}: ${topProducts[i]._sum.jumlah} sold`);
  }

  // Bottom 5 products
  const bottomProducts = await prisma.detail_pesanan.groupBy({
    by: ['nama_menu'],
    _sum: { jumlah: true },
    orderBy: { _sum: { jumlah: 'asc' } },
    take: 5,
  });
  console.log('\n  Bottom 5 Products:');
  for (let i = 0; i < bottomProducts.length; i++) {
    console.log(`    #${i + 1} ${bottomProducts[i].nama_menu}: ${bottomProducts[i]._sum.jumlah} sold`);
  }

  // Waste by reason
  const wasteByReason = await prisma.waste.groupBy({
    by: ['reason'],
    _count: true,
    _sum: { total_loss: true },
  });
  console.log('\n  Waste by Reason:');
  for (const w of wasteByReason) {
    console.log(`    ${w.reason}: ${w._count} entries, loss ${formatRupiah(w._sum.total_loss || 0)}`);
  }

  // --- Summary ---
  console.log('\n====================================');
  if (errors.length === 0) {
    console.log('✅ ALL VALIDATIONS PASSED');
  } else {
    console.log(`❌ ${errors.length} VALIDATION ERROR(S):`);
    for (const err of errors) {
      console.log(`   - ${err}`);
    }
  }
  console.log('====================================\n');

  return { passed: errors.length === 0, errors };
}
