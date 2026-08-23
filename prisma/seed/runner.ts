/**
 * Dummy Data Seed Runner for POS Angkringan.
 *
 * Modes:
 *   SEED_MODE=reset  → Wipe transactional data, then generate fresh dataset.
 *   SEED_MODE=append → Generate and append data without deleting existing.
 *
 * Usage:
 *   npx tsx prisma/seed/runner.ts
 *
 * Environment variables:
 *   SEED_MODE         (reset|append, default: append)
 *   SEED_ORDERS       (number of orders, default: 100000)
 *   SEED_START_DATE   (YYYY-MM-DD, default: 2025-08-01)
 *   SEED_END_DATE     (YYYY-MM-DD, default: 2026-08-30)
 *   SEED_RANDOM       (random seed, default: 12345)
 *   SEED_BATCH_SIZE   (batch size, default: 2000)
 *   SEED_EXPENSES     (expense records, default: 2500)
 *   SEED_WASTES       (waste records, default: 1500)
 *   NODE_ENV          (if 'production', reset mode is blocked)
 *   ALLOW_DESTRUCTIVE_SEED (set to 'true' to allow reset in production)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { SEED_CONFIG, INCOME_CATEGORY_POS, INCOME_CATEGORY_DEBT_PAYMENT, INCOME_CATEGORY_DEBT_SUPPLIER } from './config.js';
import { SeededRandom, progressBar, formatRupiah } from './utils.js';
import {
  distributeOrdersAcrossDates,
  generateOrderPlans,
  insertOrderBatches,
  insertIncomeForOrders,
  insertDebtsFromOrders,
  insertSupplierDebts,
  insertExpenses,
  insertWastes,
  insertBudgetAllocations,
  insertIngredients,
  ensureKategoriKeuangan,
  ensureMenus,
} from './generators.js';
import { runValidation } from './validators.js';

type SeedMode = 'reset' | 'append';

async function main(): Promise<void> {
  const startTime = Date.now();
  const mode: SeedMode = (process.env.SEED_MODE as SeedMode) || 'append';

  console.log('====================================');
  console.log('🌱 POS ANGKRINGAN - DUMMY DATA SEED');
  console.log('====================================');
  console.log(`Mode:          ${mode.toUpperCase()}`);
  console.log(`Orders:        ${SEED_CONFIG.ORDERS.toLocaleString()}`);
  console.log(`Date Range:    ${SEED_CONFIG.START_DATE} → ${SEED_CONFIG.END_DATE}`);
  console.log(`Random Seed:   ${SEED_CONFIG.RANDOM_SEED}`);
  console.log(`Batch Size:    ${SEED_CONFIG.BATCH_SIZE}`);
  console.log(`Expenses:      ${SEED_CONFIG.EXPENSES}`);
  console.log(`Wastes:        ${SEED_CONFIG.WASTES}`);
  console.log('====================================\n');

  // Production safety
  if (mode === 'reset') {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
      console.error('❌ SEED RESET BLOCKED: Cannot run destructive seed in production.');
      console.error('   Set ALLOW_DESTRUCTIVE_SEED=true to override.');
      process.exit(1);
    }
  }

  // Initialize Prisma
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // ============================================
    // RESET MODE: Delete transactional data
    // ============================================
    if (mode === 'reset') {
      console.log('🗑️  Resetting transactional data...\n');

      // Delete in correct dependency order (children first)
      // 1. stock_movement (references waste, katalog_menu, ingredient, user)
      const smDel = await prisma.stock_movement.deleteMany();
      console.log(`  Deleted stock_movement: ${smDel.count}`);

      // 2. debt_payment (references debt, transaksi_keuangan, user)
      const dpDel = await prisma.debt_payment.deleteMany();
      console.log(`  Deleted debt_payment: ${dpDel.count}`);

      // 3. waste (references katalog_menu, ingredient, user)
      const wDel = await prisma.waste.deleteMany();
      console.log(`  Deleted waste: ${wDel.count}`);

      // 4. debt (references pesanan, user)
      const dDel = await prisma.debt.deleteMany();
      console.log(`  Deleted debt: ${dDel.count}`);

      // 5. transaksi_keuangan (references pesanan, kategori_keuangan, user)
      const tkDel = await prisma.transaksi_keuangan.deleteMany();
      console.log(`  Deleted transaksi_keuangan: ${tkDel.count}`);

      // 6. detail_pesanan (references pesanan, katalog_menu)
      const detDel = await prisma.detail_pesanan.deleteMany();
      console.log(`  Deleted detail_pesanan: ${detDel.count}`);

      // 7. pesanan
      const pDel = await prisma.pesanan.deleteMany();
      console.log(`  Deleted pesanan: ${pDel.count}`);

      // 8. budget_allocation (references user)
      const baDel = await prisma.budget_allocation.deleteMany();
      console.log(`  Deleted budget_allocation: ${baDel.count}`);

      // 9. cash_balance (references user)
      const cbDel = await prisma.cash_balance.deleteMany();
      console.log(`  Deleted cash_balance: ${cbDel.count}`);

      // 10. ingredient (no FK children left after stock_movement + waste deleted)
      const ingDel = await prisma.ingredient.deleteMany();
      console.log(`  Deleted ingredient: ${ingDel.count}`);

      // 11. kategori_keuangan (no FK children left after transaksi_keuangan deleted)
      const kkDel = await prisma.kategori_keuangan.deleteMany();
      console.log(`  Deleted kategori_keuangan: ${kkDel.count}`);

      // DO NOT delete: user, permission, role_permission, refresh_token, katalog_menu
      // (master/auth data is preserved)

      console.log('\n✅ Reset complete. Master data preserved.\n');
    }

    // ============================================
    // STEP 1: Ensure owner user exists
    // ============================================
    console.log('👤 Ensuring owner user...');
    let owner = await prisma.user.findFirst({
      where: { role: 'OWNER', deleted_at: null },
    });

    if (!owner) {
      // Import bcrypt dynamically
      const bcryptModule = await import('bcrypt');
      const bcrypt = bcryptModule.default || bcryptModule;
      const hashedPin = await bcrypt.hash('1234', 10);
      owner = await prisma.user.create({
        data: {
          fullname: 'Owner', pin: hashedPin, role: 'OWNER', status: 'ACTIVE',
        },
      });
      console.log('  Created new owner (PIN: 1234)');
    } else {
      console.log(`  Using existing owner: ${owner.fullname} (id: ${owner.id})`);
    }
    const userId = owner.id;

    // ============================================
    // STEP 2: Ensure menus exist
    // ============================================
    console.log('\n🍽️  Ensuring menu products...');
    const menus = await ensureMenus(prisma);
    console.log(`  ${menus.length} menu items ready`);

    // ============================================
    // STEP 3: Ensure kategori_keuangan exist
    // ============================================
    console.log('\n📂 Ensuring financial categories...');
    const kategoriMap = await ensureKategoriKeuangan(prisma);
    console.log(`  ${kategoriMap.size} categories ready`);

    // ============================================
    // STEP 4: Ensure ingredients exist
    // ============================================
    console.log('\n🧂 Ensuring ingredients...');
    let ingredientIds: number[];
    const existingIngredients = await prisma.ingredient.findMany({ select: { id: true } });
    if (existingIngredients.length > 0) {
      ingredientIds = existingIngredients.map(i => i.id);
      console.log(`  Using ${ingredientIds.length} existing ingredients`);
    } else {
      ingredientIds = await insertIngredients(prisma);
      console.log(`  Created ${ingredientIds.length} ingredients`);
    }

    // ============================================
    // STEP 5: Determine starting order number
    // ============================================
    let startingOrderNumber = 1;
    if (mode === 'append') {
      const latestOrder = await prisma.pesanan.findFirst({
        orderBy: { id: 'desc' },
        select: { nomor_pesanan: true },
      });
      if (latestOrder) {
        const num = parseInt(latestOrder.nomor_pesanan.replace('PSN-', ''), 10);
        if (!isNaN(num)) {
          startingOrderNumber = num + 1;
        }
      }
    }
    console.log(`\n🔢 Starting order number: PSN-${String(startingOrderNumber).padStart(6, '0')}`);

    // ============================================
    // STEP 6: Distribute orders across dates
    // ============================================
    const rng = new SeededRandom(SEED_CONFIG.RANDOM_SEED);
    console.log('\n📅 Distributing orders across dates...');
    const orderDates = distributeOrdersAcrossDates(rng);
    console.log(`  ${orderDates.length} order slots distributed`);

    // ============================================
    // STEP 7: Generate order plans
    // ============================================
    console.log('\n📝 Generating order plans...');
    const plans = generateOrderPlans(rng, orderDates, menus);
    console.log(`  ${plans.length} order plans ready`);

    // ============================================
    // STEP 8: Insert orders + details
    // ============================================
    console.log('\n📦 Inserting orders + details...');
    const { orderIdMap, totalDetails } = await insertOrderBatches(prisma, plans, startingOrderNumber);
    console.log(`  Inserted ${orderIdMap.size} orders, ${totalDetails} detail items`);

    // ============================================
    // STEP 9: Insert income for lunas orders
    // ============================================
    console.log('\n💵 Inserting income for lunas orders...');
    const kategoriPenjualanId = kategoriMap.get(INCOME_CATEGORY_POS)!;
    const incomeCount = await insertIncomeForOrders(prisma, plans, orderIdMap, userId, kategoriPenjualanId);
    console.log(`  Inserted ${incomeCount} income records`);

    // ============================================
    // STEP 10: Insert debts (customer) from hutang orders
    // ============================================
    console.log('\n📋 Inserting customer debts...');
    const kategoriPiutangId = kategoriMap.get(INCOME_CATEGORY_DEBT_PAYMENT)!;
    const debtResult = await insertDebtsFromOrders(prisma, rng, plans, orderIdMap, userId, kategoriPiutangId);
    console.log(`  ${debtResult.debtCount} debts, ${debtResult.paymentCount} payments, ${debtResult.debtIncomeCount} income records`);

    // ============================================
    // STEP 11: Insert supplier debts
    // ============================================
    console.log('\n🏭 Inserting supplier debts...');
    const kategoriUtangId = kategoriMap.get(INCOME_CATEGORY_DEBT_SUPPLIER)!;
    const supplierResult = await insertSupplierDebts(prisma, rng, userId, kategoriUtangId);
    console.log(`  ${supplierResult.count} supplier debts, ${supplierResult.payments} payments`);

    // ============================================
    // STEP 12: Insert expenses
    // ============================================
    console.log('\n💳 Inserting expenses...');
    const expenseCategoryMap = new Map<string, number>();
    for (const [name, id] of kategoriMap.entries()) {
      expenseCategoryMap.set(name, id);
    }
    const expenseCount = await insertExpenses(prisma, rng, userId, expenseCategoryMap);
    console.log(`  Inserted ${expenseCount} expense records`);

    // ============================================
    // STEP 13: Insert waste
    // ============================================
    console.log('\n🗑️  Inserting waste records...');
    const wasteCount = await insertWastes(prisma, rng, menus, ingredientIds, userId);
    console.log(`  Inserted ${wasteCount} waste records`);

    // ============================================
    // STEP 14: Insert budget allocations
    // ============================================
    console.log('\n📊 Inserting budget allocations...');
    const existingBudgets = await prisma.budget_allocation.count();
    let budgetCount = 0;
    if (existingBudgets === 0) {
      budgetCount = await insertBudgetAllocations(prisma, userId);
      console.log(`  Inserted ${budgetCount} budget allocations`);
    } else {
      console.log(`  Skipping (${existingBudgets} already exist)`);
      budgetCount = existingBudgets;
    }

    // ============================================
    // TIMING
    // ============================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n====================================');
    console.log('🎉 DUMMY DATA SEED COMPLETED');
    console.log('====================================');
    console.log(`  Orders:          ${orderIdMap.size.toLocaleString()}`);
    console.log(`  Order Details:   ${totalDetails.toLocaleString()}`);
    console.log(`  Income (POS):    ${incomeCount.toLocaleString()}`);
    console.log(`  Debts:           ${(debtResult.debtCount + supplierResult.count).toLocaleString()}`);
    console.log(`  Debt Payments:   ${(debtResult.paymentCount + supplierResult.payments).toLocaleString()}`);
    console.log(`  Expenses:        ${expenseCount.toLocaleString()}`);
    console.log(`  Waste:           ${wasteCount.toLocaleString()}`);
    console.log(`  Budget:          ${budgetCount}`);
    console.log(`  Duration:        ${duration}s`);
    console.log('====================================\n');

    // ============================================
    // VALIDATION
    // ============================================
    const validationResult = await runValidation(prisma);

    if (!validationResult.passed) {
      console.error('❌ Seed validation FAILED. See errors above.');
      process.exit(1);
    }

    console.log('✅ Seed completed and validated successfully!');
  } catch (error: unknown) {
    console.error('\n❌ Seed FAILED:');
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
      console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
