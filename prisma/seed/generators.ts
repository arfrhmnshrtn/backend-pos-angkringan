/**
 * Generators for all seed data.
 * Each generator produces data arrays ready for Prisma createMany / create.
 */
import type { PrismaClient } from '@prisma/client';
import {
  SEED_CONFIG,
  DAY_WEIGHTS,
  MONTH_MULTIPLIERS,
  HOUR_WEIGHTS,
  ORDER_STATUS_WEIGHTS,
  PAYMENT_METHOD_WEIGHTS,
  ITEMS_PER_ORDER_WEIGHTS,
  QUANTITY_WEIGHTS,
  CUSTOMER_NAMES,
  MENU_PRODUCTS,
  INGREDIENTS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORY_POS,
  INCOME_CATEGORY_DEBT_PAYMENT,
  INCOME_CATEGORY_DEBT_SUPPLIER,
  DEBT_STATUS_WEIGHTS,
  SUPPLIER_DEBT_COUNT,
  SUPPLIER_NAMES,
  WASTE_REASON_WEIGHTS,
  BUDGET_ALLOCATIONS,
  type MenuConfig,
  type ExpenseCategoryConfig,
} from './config.js';
import {
  SeededRandom,
  createWibDate,
  getDateRange,
  getDayOfWeek,
  getMonth,
  pickHour,
  progressBar,
  formatRupiah,
} from './utils.js';

// ============================================================
// Types matching Prisma schema exactly
// ============================================================

interface MenuRecord {
  id: number;
  nama_item: string;
  kategori: 'bakaran' | 'jajanan' | 'minuman' | 'makanan';
  stok: number;
  harga_modal: number;
  harga_jual: number;
  popularity: number;
}

interface OrderPlan {
  dateStr: string;
  hour: number;
  minute: number;
  second: number;
  status: 'lunas' | 'hutang' | 'belum_bayar';
  metode_pembayaran: 'tunai' | 'qris' | 'transfer' | null;
  nama_pelanggan: string | null;
  items: Array<{
    menuId: number;
    nama_menu: string;
    harga: number;
    jumlah: number;
    subtotal: number;
  }>;
  total_item: number;
  total_harga: number;
}

interface KategoriKeuanganRecord {
  id: number;
  nama: string;
  jenis: 'pemasukan' | 'pengeluaran';
}

// ============================================================
// 1. Distribute orders across dates
// ============================================================

export function distributeOrdersAcrossDates(rng: SeededRandom): string[] {
  const dates = getDateRange(SEED_CONFIG.START_DATE, SEED_CONFIG.END_DATE);
  const totalOrders = SEED_CONFIG.ORDERS;

  // Calculate raw weight for each date
  const dateWeights: Array<{ dateStr: string; weight: number }> = [];
  let totalWeight = 0;

  for (const dateStr of dates) {
    const dayIdx = getDayOfWeek(dateStr); // 0=Mon..6=Sun
    const monthIdx = getMonth(dateStr) - 1; // 0-11

    let weight = DAY_WEIGHTS[dayIdx] * MONTH_MULTIPLIERS[monthIdx];
    // Add random jitter ±20%
    weight *= 0.80 + rng.next() * 0.40;

    // Simulate occasional very quiet days (~2% chance)
    if (rng.chance(0.02)) {
      weight *= 0.15;
    }
    // Simulate occasional busy days (~3% chance)
    if (rng.chance(0.03)) {
      weight *= 1.6;
    }

    dateWeights.push({ dateStr, weight });
    totalWeight += weight;
  }

  // Assign order counts proportionally
  const orderDates: string[] = [];
  let assigned = 0;

  for (let i = 0; i < dateWeights.length; i++) {
    const isLast = i === dateWeights.length - 1;
    let count: number;
    if (isLast) {
      count = totalOrders - assigned;
    } else {
      const rawCount = (dateWeights[i].weight / totalWeight) * totalOrders;
      count = Math.round(rawCount);
      // Clamp to avoid negative from rounding
      if (assigned + count > totalOrders) {
        count = totalOrders - assigned;
      }
    }

    for (let j = 0; j < count; j++) {
      orderDates.push(dateWeights[i].dateStr);
    }
    assigned += count;
  }

  return orderDates;
}

// ============================================================
// 2. Generate order plans (in-memory, no DB yet)
// ============================================================

export function generateOrderPlans(
  rng: SeededRandom,
  orderDates: string[],
  menus: MenuRecord[],
): OrderPlan[] {
  const plans: OrderPlan[] = [];

  // Build weighted menu list
  const menuWeighted = menus.map(m => ({ ...m, weight: m.popularity }));

  for (let i = 0; i < orderDates.length; i++) {
    const dateStr = orderDates[i];

    // Time
    const hour = pickHour(rng, HOUR_WEIGHTS);
    const minute = rng.int(0, 59);
    const second = rng.int(0, 59);

    // Status
    const status = rng.weightedKey(ORDER_STATUS_WEIGHTS) as 'lunas' | 'hutang' | 'belum_bayar';

    // Payment method (only if lunas)
    let metode_pembayaran: 'tunai' | 'qris' | 'transfer' | null = null;
    if (status === 'lunas') {
      metode_pembayaran = rng.weightedKey(PAYMENT_METHOD_WEIGHTS) as 'tunai' | 'qris' | 'transfer';
    }

    // Customer name (~60% have customer name)
    const nama_pelanggan = rng.chance(0.60) ? rng.pick(CUSTOMER_NAMES) : null;

    // Items - select menus with weighted probability (popular items picked more often)
    const itemCountObj = rng.weighted(ITEMS_PER_ORDER_WEIGHTS);
    const itemCount = Math.min(itemCountObj.count, menus.length);
    
    // Pick unique menus using weighted selection (popularity-based)
    const selectedMenus: typeof menuWeighted = [];
    const usedIds = new Set<number>();
    for (let attempt = 0; attempt < itemCount; attempt++) {
      // Filter out already-selected menus
      const available = menuWeighted.filter(m => !usedIds.has(m.id));
      if (available.length === 0) break;
      const chosen = rng.weighted(available);
      selectedMenus.push(chosen);
      usedIds.add(chosen.id);
    }

    let total_item = 0;
    let total_harga = 0;
    const items: OrderPlan['items'] = [];

    for (const menu of selectedMenus) {
      const qtyObj = rng.weighted(QUANTITY_WEIGHTS);
      const jumlah = qtyObj.qty;
      const subtotal = menu.harga_jual * jumlah;

      items.push({
        menuId: menu.id,
        nama_menu: menu.nama_item,
        harga: menu.harga_jual,
        jumlah,
        subtotal,
      });

      total_item += jumlah;
      total_harga += subtotal;
    }

    plans.push({
      dateStr,
      hour,
      minute,
      second,
      status,
      metode_pembayaran,
      nama_pelanggan,
      items,
      total_item,
      total_harga,
    });
  }

  return plans;
}

// ============================================================
// 3. Insert orders + details in batches
// ============================================================

export async function insertOrderBatches(
  prisma: PrismaClient,
  plans: OrderPlan[],
  startingOrderNumber: number,
): Promise<{
  orderIdMap: Map<number, { planIndex: number; id: number; nomor_pesanan: string }>;
  totalDetails: number;
}> {
  const batchSize = SEED_CONFIG.BATCH_SIZE;
  const totalBatches = Math.ceil(plans.length / batchSize);
  const orderIdMap = new Map<number, { planIndex: number; id: number; nomor_pesanan: string }>();
  let totalDetails = 0;
  let orderNumCounter = startingOrderNumber;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, plans.length);
    const batchPlans = plans.slice(start, end);

    // Insert orders
    const orderData = batchPlans.map((plan) => {
      const nomorPesanan = `PSN-${String(orderNumCounter++).padStart(6, '0')}`;
      const createdAt = createWibDate(plan.dateStr, plan.hour, plan.minute, plan.second);
      return {
        nomor_pesanan: nomorPesanan,
        nama_pelanggan: plan.nama_pelanggan,
        total_item: plan.total_item,
        total_harga: plan.total_harga,
        metode_pembayaran: plan.metode_pembayaran,
        status: plan.status,
        created_at: createdAt,
        updated_at: createdAt,
      };
    });

    // Use createManyAndReturn if available, otherwise createMany + findMany
    const createdOrders = await prisma.pesanan.createManyAndReturn({
      data: orderData,
      select: { id: true, nomor_pesanan: true },
    });

    // Map order IDs back to plan indices
    for (let j = 0; j < createdOrders.length; j++) {
      const planIndex = start + j;
      orderIdMap.set(planIndex, {
        planIndex,
        id: createdOrders[j].id,
        nomor_pesanan: createdOrders[j].nomor_pesanan,
      });
    }

    // Insert detail_pesanan for this batch
    const detailData: Array<{
      id_pesanan: number;
      id_menu: number;
      nama_menu: string;
      harga: number;
      jumlah: number;
      subtotal: number;
      created_at: Date;
      updated_at: Date;
    }> = [];

    for (let j = 0; j < batchPlans.length; j++) {
      const planIndex = start + j;
      const orderId = orderIdMap.get(planIndex)!.id;
      const plan = batchPlans[j];
      const createdAt = createWibDate(plan.dateStr, plan.hour, plan.minute, plan.second);

      for (const item of plan.items) {
        detailData.push({
          id_pesanan: orderId,
          id_menu: item.menuId,
          nama_menu: item.nama_menu,
          harga: item.harga,
          jumlah: item.jumlah,
          subtotal: item.subtotal,
          created_at: createdAt,
          updated_at: createdAt,
        });
      }
    }

    await prisma.detail_pesanan.createMany({ data: detailData });
    totalDetails += detailData.length;

    progressBar('Orders', end, plans.length);
  }

  return { orderIdMap, totalDetails };
}

// ============================================================
// 4. Generate income (transaksi_keuangan for lunas orders)
// ============================================================

export async function insertIncomeForOrders(
  prisma: PrismaClient,
  plans: OrderPlan[],
  orderIdMap: Map<number, { planIndex: number; id: number; nomor_pesanan: string }>,
  userId: number,
  kategoriPenjualanId: number,
): Promise<number> {
  const batchSize = SEED_CONFIG.BATCH_SIZE;
  let trxCounter = 1;
  let totalIncome = 0;

  // Collect all income records first
  const incomeRecords: Array<{
    nomor_transaksi: string;
    jenis: 'pemasukan';
    id_kategori: number;
    nominal: number;
    metode_pembayaran: 'tunai' | 'qris' | 'transfer' | null;
    keterangan: string;
    id_pesanan: number;
    id_user: number;
    created_at: Date;
    updated_at: Date;
  }> = [];

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    if (plan.status !== 'lunas') continue;

    const orderInfo = orderIdMap.get(i);
    if (!orderInfo) continue;

    const createdAt = createWibDate(plan.dateStr, plan.hour, plan.minute, plan.second);

    incomeRecords.push({
      nomor_transaksi: `TRX-${String(trxCounter++).padStart(6, '0')}`,
      jenis: 'pemasukan',
      id_kategori: kategoriPenjualanId,
      nominal: plan.total_harga,
      metode_pembayaran: plan.metode_pembayaran,
      keterangan: `Pembayaran Pesanan ${orderInfo.nomor_pesanan}`,
      id_pesanan: orderInfo.id,
      id_user: userId,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  // Insert in batches
  const totalBatches = Math.ceil(incomeRecords.length / batchSize);
  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, incomeRecords.length);
    await prisma.transaksi_keuangan.createMany({
      data: incomeRecords.slice(start, end),
    });
    progressBar('Income (POS)', end, incomeRecords.length);
  }

  totalIncome = incomeRecords.length;
  return totalIncome;
}

// ============================================================
// 5. Generate debts from hutang orders
// ============================================================

export async function insertDebtsFromOrders(
  prisma: PrismaClient,
  rng: SeededRandom,
  plans: OrderPlan[],
  orderIdMap: Map<number, { planIndex: number; id: number; nomor_pesanan: string }>,
  userId: number,
  kategoriPiutangId: number,
): Promise<{ debtCount: number; paymentCount: number; debtIncomeCount: number }> {
  let debtCount = 0;
  let paymentCount = 0;
  let debtIncomeCount = 0;
  let trxCounter = 200000; // Offset to avoid collision with POS income TRX numbers

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    if (plan.status !== 'hutang') continue;

    const orderInfo = orderIdMap.get(i);
    if (!orderInfo) continue;

    const createdAt = createWibDate(plan.dateStr, plan.hour, plan.minute, plan.second);

    // Determine debt outcome
    const debtStatus = rng.weightedKey(DEBT_STATUS_WEIGHTS) as 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS' | 'DIBATALKAN';

    let paid_amount = 0;
    let remaining_amount = plan.total_harga;
    let finalStatus: 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS' | 'DIBATALKAN' = debtStatus;

    if (debtStatus === 'LUNAS') {
      paid_amount = plan.total_harga;
      remaining_amount = 0;
    } else if (debtStatus === 'SEBAGIAN') {
      paid_amount = rng.int(Math.floor(plan.total_harga * 0.1), Math.floor(plan.total_harga * 0.9));
      remaining_amount = plan.total_harga - paid_amount;
    } else if (debtStatus === 'DIBATALKAN') {
      paid_amount = 0;
      remaining_amount = plan.total_harga;
    }

    const debt = await prisma.debt.create({
      data: {
        type: 'CUSTOMER',
        customer_name: plan.nama_pelanggan || `Pelanggan POS ${orderInfo.nomor_pesanan}`,
        note: 'Otomatis dari transaksi POS (seed)',
        total_amount: plan.total_harga,
        paid_amount,
        remaining_amount,
        status: finalStatus,
        id_pesanan: orderInfo.id,
        created_by: userId,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    debtCount++;

    // Generate payments if SEBAGIAN or LUNAS
    if (finalStatus === 'SEBAGIAN' || finalStatus === 'LUNAS') {
      const paymentMethods: Array<'tunai' | 'qris' | 'transfer'> = ['tunai', 'qris', 'transfer'];
      let amountRemaining = paid_amount;
      
      // Decide number of payments: 1-3
      const numPayments = finalStatus === 'LUNAS' ? rng.int(1, 3) : rng.int(1, 2);
      const paymentAmounts: number[] = [];

      for (let p = 0; p < numPayments; p++) {
        if (p === numPayments - 1) {
          paymentAmounts.push(amountRemaining);
        } else {
          const portion = rng.int(
            Math.floor(amountRemaining * 0.2),
            Math.floor(amountRemaining * 0.7),
          );
          paymentAmounts.push(portion);
          amountRemaining -= portion;
        }
      }

      for (let p = 0; p < paymentAmounts.length; p++) {
        const paymentMethod = rng.pick(paymentMethods);
        // Payment date: debt date + 1-30 days
        const daysAfter = rng.int(1, 30);
        const paymentDate = new Date(createdAt.getTime() + daysAfter * 24 * 60 * 60 * 1000);

        const trxNum = `TRX-${String(trxCounter++).padStart(6, '0')}`;

        // Create transaksi_keuangan for this payment
        const transaksi = await prisma.transaksi_keuangan.create({
          data: {
            nomor_transaksi: trxNum,
            jenis: 'pemasukan',
            id_kategori: kategoriPiutangId,
            nominal: paymentAmounts[p],
            metode_pembayaran: paymentMethod,
            keterangan: `Pembayaran piutang pelanggan: ${plan.nama_pelanggan || orderInfo.nomor_pesanan}`,
            id_user: userId,
            id_pesanan: orderInfo.id,
            created_at: paymentDate,
            updated_at: paymentDate,
          },
        });

        await prisma.debt_payment.create({
          data: {
            id_debt: debt.id,
            amount: paymentAmounts[p],
            payment_method: paymentMethod,
            id_user: userId,
            id_transaksi_keuangan: transaksi.id,
            paid_at: paymentDate,
            created_at: paymentDate,
            updated_at: paymentDate,
          },
        });

        paymentCount++;
        debtIncomeCount++;
      }
    }

    if (debtCount % 200 === 0) {
      progressBar('Debts (Customer)', debtCount, Math.round(plans.length * 0.08));
    }
  }

  console.log(); // newline after progress
  return { debtCount, paymentCount, debtIncomeCount };
}

// ============================================================
// 6. Generate supplier debts (not linked to orders)
// ============================================================

export async function insertSupplierDebts(
  prisma: PrismaClient,
  rng: SeededRandom,
  userId: number,
  kategoriUtangId: number,
): Promise<{ count: number; payments: number }> {
  let count = 0;
  let payments = 0;
  let trxCounter = 400000;
  const dates = getDateRange(SEED_CONFIG.START_DATE, SEED_CONFIG.END_DATE);

  for (let i = 0; i < SUPPLIER_DEBT_COUNT; i++) {
    const dateStr = rng.pick(dates);
    const createdAt = createWibDate(dateStr, rng.int(8, 17), rng.int(0, 59), rng.int(0, 59));
    const totalAmount = rng.int(100000, 3000000);

    const debtStatus = rng.weightedKey(DEBT_STATUS_WEIGHTS) as 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS' | 'DIBATALKAN';
    let paid = 0;
    let remaining = totalAmount;

    if (debtStatus === 'LUNAS') {
      paid = totalAmount;
      remaining = 0;
    } else if (debtStatus === 'SEBAGIAN') {
      paid = rng.int(Math.floor(totalAmount * 0.1), Math.floor(totalAmount * 0.8));
      remaining = totalAmount - paid;
    }

    const debt = await prisma.debt.create({
      data: {
        type: 'SUPPLIER',
        supplier_name: rng.pick(SUPPLIER_NAMES),
        note: `Pembelian bahan dari supplier (seed #${i + 1})`,
        total_amount: totalAmount,
        paid_amount: paid,
        remaining_amount: remaining,
        status: debtStatus,
        created_by: userId,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    count++;

    // Payments for this supplier debt
    if (debtStatus === 'SEBAGIAN' || debtStatus === 'LUNAS') {
      const numPayments = rng.int(1, 3);
      let amountLeft = paid;

      for (let p = 0; p < numPayments; p++) {
        const payAmount = p === numPayments - 1 ? amountLeft : rng.int(Math.floor(amountLeft * 0.2), Math.floor(amountLeft * 0.7));
        amountLeft -= payAmount;
        if (amountLeft < 0) amountLeft = 0;

        const pm = rng.pick(['tunai', 'qris', 'transfer'] as const);
        const daysAfter = rng.int(1, 45);
        const paidAt = new Date(createdAt.getTime() + daysAfter * 24 * 60 * 60 * 1000);
        const trxNum = `TRX-${String(trxCounter++).padStart(6, '0')}`;

        const transaksi = await prisma.transaksi_keuangan.create({
          data: {
            nomor_transaksi: trxNum,
            jenis: 'pengeluaran',
            id_kategori: kategoriUtangId,
            nominal: payAmount || 1000, // safety: never zero
            metode_pembayaran: pm,
            keterangan: `Pembayaran utang supplier: ${debt.supplier_name}`,
            id_user: userId,
            created_at: paidAt,
            updated_at: paidAt,
          },
        });

        await prisma.debt_payment.create({
          data: {
            id_debt: debt.id,
            amount: payAmount || 1000,
            payment_method: pm,
            id_user: userId,
            id_transaksi_keuangan: transaksi.id,
            paid_at: paidAt,
            created_at: paidAt,
            updated_at: paidAt,
          },
        });
        payments++;
      }
    }
  }

  return { count, payments };
}

// ============================================================
// 7. Generate expense records
// ============================================================

export async function insertExpenses(
  prisma: PrismaClient,
  rng: SeededRandom,
  userId: number,
  expenseCategoryMap: Map<string, number>,
): Promise<number> {
  const dates = getDateRange(SEED_CONFIG.START_DATE, SEED_CONFIG.END_DATE);
  const batchSize = SEED_CONFIG.BATCH_SIZE;
  const totalExpenses = SEED_CONFIG.EXPENSES;

  const records: Array<{
    nomor_transaksi: string;
    jenis: 'pengeluaran';
    id_kategori: number;
    nominal: number;
    metode_pembayaran: 'tunai' | 'qris' | 'transfer';
    keterangan: string;
    id_user: number;
    created_at: Date;
    updated_at: Date;
  }> = [];

  let trxCounter = 500000;

  for (let i = 0; i < totalExpenses; i++) {
    const catConfig = rng.weighted(EXPENSE_CATEGORIES.map(c => ({ ...c, weight: c.weight })));
    const catId = expenseCategoryMap.get(catConfig.nama);
    if (!catId) continue;

    // Pick date based on frequency
    let dateStr: string;
    if (catConfig.frequency === 'monthly') {
      // Pick a specific day each month (1-5)
      const randomMonth = rng.pick(dates);
      const [y, m] = randomMonth.split('-');
      const day = rng.int(1, 5);
      dateStr = `${y}-${m}-${String(day).padStart(2, '0')}`;
      // Validate date is in range
      if (dateStr < SEED_CONFIG.START_DATE || dateStr > SEED_CONFIG.END_DATE) {
        dateStr = rng.pick(dates);
      }
    } else {
      dateStr = rng.pick(dates);
    }

    const hour = rng.int(7, 18);
    const createdAt = createWibDate(dateStr, hour, rng.int(0, 59), rng.int(0, 59));
    const nominal = rng.int(catConfig.minAmount, catConfig.maxAmount);
    const pm = rng.pick(['tunai', 'qris', 'transfer'] as const);

    records.push({
      nomor_transaksi: `TRX-${String(trxCounter++).padStart(6, '0')}`,
      jenis: 'pengeluaran',
      id_kategori: catId,
      nominal,
      metode_pembayaran: pm,
      keterangan: `${catConfig.nama} - ${dateStr}`,
      id_user: userId,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  // Insert in batches
  const totalBatches = Math.ceil(records.length / batchSize);
  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, records.length);
    await prisma.transaksi_keuangan.createMany({
      data: records.slice(start, end),
    });
    progressBar('Expenses', end, records.length);
  }

  return records.length;
}

// ============================================================
// 8. Generate waste records
// ============================================================

export async function insertWastes(
  prisma: PrismaClient,
  rng: SeededRandom,
  menus: MenuRecord[],
  ingredientIds: number[],
  userId: number,
): Promise<number> {
  const dates = getDateRange(SEED_CONFIG.START_DATE, SEED_CONFIG.END_DATE);
  const totalWastes = SEED_CONFIG.WASTES;
  const batchSize = SEED_CONFIG.BATCH_SIZE;
  const wasteReasons = WASTE_REASON_WEIGHTS.map(w => ({ reason: w.reason as 'BASI' | 'KADALUARSA' | 'RUSAK' | 'GOSONG' | 'JATUH' | 'SALAH_PRODUKSI' | 'SISA_PRODUKSI' | 'HILANG' | 'LAINNYA', weight: w.weight }));

  const records: Array<{
    type: 'PRODUCT' | 'INGREDIENT';
    id_katalog_menu: number | null;
    id_ingredient: number | null;
    quantity: number;
    unit: string;
    cost_per_unit: number;
    total_loss: number;
    reason: 'BASI' | 'KADALUARSA' | 'RUSAK' | 'GOSONG' | 'JATUH' | 'SALAH_PRODUKSI' | 'SISA_PRODUKSI' | 'HILANG' | 'LAINNYA';
    note: string | null;
    created_by: number;
    created_at: Date;
    updated_at: Date;
  }> = [];

  for (let i = 0; i < totalWastes; i++) {
    const dateStr = rng.pick(dates);
    const hour = rng.int(16, 23);
    const createdAt = createWibDate(dateStr, hour, rng.int(0, 59), rng.int(0, 59));
    const reason = rng.weighted(wasteReasons).reason;

    // 70% Product waste, 30% Ingredient waste
    const isProduct = rng.chance(0.70);

    if (isProduct) {
      // Pick a menu weighted by popularity (popular items → more likely waste)
      const menu = rng.weighted(menus.map(m => ({ ...m, weight: m.popularity })));
      const quantity = rng.int(1, 5);
      const cost_per_unit = menu.harga_modal;
      const total_loss = cost_per_unit * quantity;

      records.push({
        type: 'PRODUCT',
        id_katalog_menu: menu.id,
        id_ingredient: null,
        quantity,
        unit: 'porsi',
        cost_per_unit,
        total_loss,
        reason,
        note: quantity > 3 ? `Waste besar: ${menu.nama_item}` : null,
        created_by: userId,
        created_at: createdAt,
        updated_at: createdAt,
      });
    } else if (ingredientIds.length > 0) {
      const ingId = rng.pick(ingredientIds);
      // We don't have ingredient details in menus array, so use simple values
      const quantity = rng.int(1, 3);
      const cost_per_unit = rng.int(5000, 20000);
      const total_loss = cost_per_unit * quantity;

      records.push({
        type: 'INGREDIENT',
        id_katalog_menu: null,
        id_ingredient: ingId,
        quantity,
        unit: 'unit',
        cost_per_unit,
        total_loss,
        reason,
        note: null,
        created_by: userId,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }
  }

  // Insert in batches
  const totalBatches = Math.ceil(records.length / batchSize);
  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, records.length);
    await prisma.waste.createMany({
      data: records.slice(start, end),
    });
    progressBar('Waste', end, records.length);
  }

  return records.length;
}

// ============================================================
// 9. Budget allocations
// ============================================================

export async function insertBudgetAllocations(
  prisma: PrismaClient,
  userId: number,
): Promise<number> {
  for (const budget of BUDGET_ALLOCATIONS) {
    await prisma.budget_allocation.create({
      data: {
        name: budget.name,
        percentage: budget.percentage,
        is_active: true,
        description: budget.description,
        created_by: userId,
      },
    });
  }
  return BUDGET_ALLOCATIONS.length;
}

// ============================================================
// 10. Ingredients
// ============================================================

export async function insertIngredients(
  prisma: PrismaClient,
): Promise<number[]> {
  const ids: number[] = [];
  for (const ing of INGREDIENTS) {
    const created = await prisma.ingredient.create({
      data: {
        name: ing.name,
        stock: ing.stock,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit,
      },
    });
    ids.push(created.id);
  }
  return ids;
}

// ============================================================
// 11. Ensure kategori_keuangan exist
// ============================================================

export async function ensureKategoriKeuangan(
  prisma: PrismaClient,
): Promise<Map<string, number>> {
  const allCategories: Array<{ nama: string; jenis: 'pemasukan' | 'pengeluaran' }> = [
    { nama: INCOME_CATEGORY_POS, jenis: 'pemasukan' },
    { nama: INCOME_CATEGORY_DEBT_PAYMENT, jenis: 'pemasukan' },
    { nama: INCOME_CATEGORY_DEBT_SUPPLIER, jenis: 'pengeluaran' },
    // Add expense categories (their jenis is always 'pengeluaran')
    ...EXPENSE_CATEGORIES.map(c => ({ nama: c.nama, jenis: 'pengeluaran' as const })),
  ];

  const map = new Map<string, number>();

  for (const cat of allCategories) {
    const existing = await prisma.kategori_keuangan.findUnique({
      where: { nama: cat.nama },
    });

    if (existing) {
      map.set(cat.nama, existing.id);
    } else {
      const created = await prisma.kategori_keuangan.create({
        data: { nama: cat.nama, jenis: cat.jenis },
      });
      map.set(cat.nama, created.id);
    }
  }

  return map;
}

// ============================================================
// 12. Insert menus (upsert by name to reuse existing)
// ============================================================

export async function ensureMenus(
  prisma: PrismaClient,
): Promise<MenuRecord[]> {
  const menus: MenuRecord[] = [];

  for (const menuConfig of MENU_PRODUCTS) {
    // Check if already exists by name
    const existing = await prisma.katalog_menu.findFirst({
      where: { nama_item: menuConfig.nama_item },
    });

    if (existing) {
      menus.push({
        id: existing.id,
        nama_item: existing.nama_item,
        kategori: existing.kategori as MenuRecord['kategori'],
        stok: existing.stok,
        harga_modal: existing.harga_modal,
        harga_jual: existing.harga_jual,
        popularity: menuConfig.popularity,
      });
    } else {
      const created = await prisma.katalog_menu.create({
        data: {
          nama_item: menuConfig.nama_item,
          kategori: menuConfig.kategori,
          stok: menuConfig.stok,
          harga_modal: menuConfig.harga_modal,
          harga_jual: menuConfig.harga_jual,
        },
      });
      menus.push({
        id: created.id,
        nama_item: created.nama_item,
        kategori: created.kategori as MenuRecord['kategori'],
        stok: created.stok,
        harga_modal: created.harga_modal,
        harga_jual: created.harga_jual,
        popularity: menuConfig.popularity,
      });
    }
  }

  return menus;
}
