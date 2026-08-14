import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { waste_type, stock_movement_type } from '@prisma/client';
import { CreateWasteDto } from './dto/create-waste.dto.js';
import { UpdateWasteDto } from './dto/update-waste.dto.js';

@Injectable()
export class WastesService {
  private readonly logger = new Logger(WastesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createWasteDto: CreateWasteDto, userId: number) {
    const { type, item_id, quantity, reason, note } = createWasteDto;

    return await this.prisma.$transaction(async (tx) => {
      let cost_per_unit = 0;
      let unit = '';
      let stock_before = 0;
      let stock_after = 0;

      if (type === waste_type.PRODUCT) {
        const product = await tx.katalog_menu.findUnique({ where: { id: item_id } });
        if (!product) throw new NotFoundException('Product tidak ditemukan');
        if (product.stok < quantity) throw new BadRequestException('Stok tidak mencukupi untuk mencatat barang terbuang.');
        
        cost_per_unit = product.harga_modal;
        unit = 'pcs'; 
        stock_before = product.stok;
        stock_after = stock_before - quantity;

        await tx.katalog_menu.update({
          where: { id: item_id },
          data: { stok: stock_after }
        });

      } else if (type === waste_type.INGREDIENT) {
        const ingredient = await tx.ingredient.findUnique({ where: { id: item_id } });
        if (!ingredient) throw new NotFoundException('Ingredient tidak ditemukan');
        if (ingredient.stock < quantity) throw new BadRequestException('Stok tidak mencukupi untuk mencatat barang terbuang.');
        
        cost_per_unit = ingredient.cost_per_unit;
        unit = ingredient.unit;
        stock_before = ingredient.stock;
        stock_after = stock_before - quantity;

        await tx.ingredient.update({
          where: { id: item_id },
          data: { stock: stock_after }
        });
      }

      const total_loss = cost_per_unit * quantity;

      const waste = await tx.waste.create({
        data: {
          type,
          id_katalog_menu: type === waste_type.PRODUCT ? item_id : null,
          id_ingredient: type === waste_type.INGREDIENT ? item_id : null,
          quantity,
          unit,
          cost_per_unit,
          total_loss,
          reason,
          note,
          created_by: userId,
        }
      });

      await tx.stock_movement.create({
        data: {
          type: stock_movement_type.WASTE,
          id_katalog_menu: type === waste_type.PRODUCT ? item_id : null,
          id_ingredient: type === waste_type.INGREDIENT ? item_id : null,
          quantity: -quantity,
          stock_before,
          stock_after,
          reference_type: 'WASTE',
          reference_id: waste.id,
          id_waste: waste.id,
          created_by: userId,
        }
      });

      this.logger.log(`Created waste record: ${waste.id} by user: ${userId}`);

      return {
        message: 'Barang terbuang berhasil dicatat',
        data: waste
      };
    });
  }

  async findAll(query: any) {
    const { startDate, endDate, type, reason, item_id, created_by, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at = {
        gte: new Date(startDate),
        lte: end,
      };
    } else if (startDate) {
      where.created_at = { gte: new Date(startDate) };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at = { lte: end };
    }

    if (type) where.type = type;
    if (reason) where.reason = reason;
    if (created_by) where.created_by = Number(created_by);
    
    if (item_id) {
      if (type === waste_type.PRODUCT) where.id_katalog_menu = Number(item_id);
      else if (type === waste_type.INGREDIENT) where.id_ingredient = Number(item_id);
      else {
        where.OR = [
          { id_katalog_menu: Number(item_id) },
          { id_ingredient: Number(item_id) }
        ];
      }
    }

    if (search) {
      const searchMode = { contains: search, mode: 'insensitive' };
      where.OR = [
        { note: searchMode },
        {
          katalog_menu: {
            nama_item: searchMode
          }
        },
        {
          ingredient: {
            name: searchMode
          }
        }
      ];
    }

    const [total, wastes] = await Promise.all([
      this.prisma.waste.count({ where }),
      this.prisma.waste.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, fullname: true } },
          katalog_menu: { select: { id: true, nama_item: true } },
          ingredient: { select: { id: true, name: true } },
        }
      })
    ]);

    const formattedWastes = wastes.map((w) => ({
      ...w,
      item_id: w.type === waste_type.PRODUCT ? w.id_katalog_menu : w.id_ingredient,
      item_name: w.type === waste_type.PRODUCT ? w.katalog_menu?.nama_item : w.ingredient?.name,
    }));

    return {
      message: 'Daftar barang terbuang berhasil diambil',
      data: formattedWastes,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / take)
      }
    };
  }

  async findOne(id: number) {
    const waste = await this.prisma.waste.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullname: true, role: true } },
        katalog_menu: { select: { id: true, nama_item: true } },
        ingredient: { select: { id: true, name: true } },
        stock_movements: true
      }
    });

    if (!waste) throw new NotFoundException('Barang terbuang tidak ditemukan');

    const formattedWaste = {
      ...waste,
      item_id: waste.type === waste_type.PRODUCT ? waste.id_katalog_menu : waste.id_ingredient,
      item_name: waste.type === waste_type.PRODUCT ? waste.katalog_menu?.nama_item : waste.ingredient?.name,
    };

    return {
      message: 'Detail barang terbuang berhasil diambil',
      data: formattedWaste
    };
  }

  async getSummary(query: any) {
    const { startDate, endDate } = query;
    const where: any = {};

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at = { gte: new Date(startDate), lte: end };
    }

    const result = await this.prisma.waste.aggregate({
      where,
      _sum: { total_loss: true, quantity: true },
      _count: { id: true }
    });

    return {
      message: 'Ringkasan barang terbuang berhasil diambil',
      data: {
        total_waste_amount: result._sum.total_loss || 0,
        total_waste_quantity: result._sum.quantity || 0,
        total_records: result._count.id
      }
    };
  }

  async getAnalysis(query: any) {
    const { startDate, endDate, type, item_id } = query;
    const where: any = {};

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at = { gte: new Date(startDate), lte: end };
    }
    if (type) where.type = type;
    if (item_id) {
      if (type === waste_type.PRODUCT) where.id_katalog_menu = Number(item_id);
      else if (type === waste_type.INGREDIENT) where.id_ingredient = Number(item_id);
    }

    const summaryReq = this.prisma.waste.aggregate({
      where,
      _sum: { total_loss: true, quantity: true },
      _count: { id: true }
    });

    const byReasonReq = this.prisma.waste.groupBy({
      by: ['reason'],
      where,
      _sum: { quantity: true, total_loss: true }
    });

    const itemsReq = this.prisma.waste.findMany({
      where,
      include: {
        katalog_menu: { select: { id: true, nama_item: true } },
        ingredient: { select: { id: true, name: true } }
      }
    });

    const [summary, byReason, wastes] = await Promise.all([summaryReq, byReasonReq, itemsReq]);

    // Format byReason
    const formattedByReason = byReason.map(r => ({
      reason: r.reason,
      quantity: r._sum.quantity || 0,
      total_loss: r._sum.total_loss || 0
    }));

    // Aggregate items
    const itemsMap = new Map();
    wastes.forEach(w => {
      const key = `${w.type}-${w.type === waste_type.PRODUCT ? w.id_katalog_menu : w.id_ingredient}`;
      const name = w.type === waste_type.PRODUCT ? w.katalog_menu?.nama_item : w.ingredient?.name;
      const itemId = w.type === waste_type.PRODUCT ? w.id_katalog_menu : w.id_ingredient;
      
      if (!itemsMap.has(key)) {
        itemsMap.set(key, { id: itemId, type: w.type, name, quantity: 0, total_loss: 0 });
      }
      const existing = itemsMap.get(key);
      existing.quantity += w.quantity;
      existing.total_loss += w.total_loss;
    });

    const top_wasted_items = Array.from(itemsMap.values())
      .sort((a, b) => b.total_loss - a.total_loss)
      .slice(0, 10);

    // Aggregate daily
    const dailyMap = new Map();
    wastes.forEach(w => {
      // Local time formatting for daily waste
      const date = new Date(w.created_at).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, quantity: 0, total_loss: 0 });
      }
      const existing = dailyMap.get(date);
      existing.quantity += w.quantity;
      existing.total_loss += w.total_loss;
    });

    const daily_waste = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Wait, waste ratio from sales? Let's check sales logic if needed. 
    // We are asked to include waste_ratio "Jika data penjualan tersedia". It might be better to do that here by grabbing total orders.
    const orderSum = await this.prisma.pesanan.aggregate({
      where: { 
        status: 'lunas',
        created_at: where.created_at // Use same date filter
      }, 
      _sum: { total_harga: true }
    });
    
    const total_revenue = orderSum._sum.total_harga || 0;
    const total_loss_amount = summary._sum.total_loss || 0;
    const waste_ratio = total_revenue > 0 ? ((total_loss_amount / total_revenue) * 100).toFixed(2) : 0;

    return {
      message: 'Analisis barang terbuang berhasil diambil',
      data: {
        summary: {
          total_loss: total_loss_amount,
          total_quantity: summary._sum.quantity || 0,
          total_records: summary._count.id,
          average_loss_per_record: summary._count.id > 0 ? (total_loss_amount / summary._count.id) : 0,
          waste_ratio: Number(waste_ratio)
        },
        by_reason: formattedByReason,
        top_wasted_items,
        daily_waste
      }
    };
  }

  async update(id: number, updateWasteDto: UpdateWasteDto, userId: number) {
    if (Object.keys(updateWasteDto).length === 0) {
      throw new BadRequestException('Tidak ada data yang diubah');
    }

    return await this.prisma.$transaction(async (tx) => {
      const oldWaste = await tx.waste.findUnique({ where: { id } });
      if (!oldWaste) throw new NotFoundException('Barang terbuang tidak ditemukan');
      
      const isQuantityChanged = updateWasteDto.quantity !== undefined && updateWasteDto.quantity !== oldWaste.quantity;
      
      // We don't support changing type or item_id in update to keep history simple.
      if (updateWasteDto.type && updateWasteDto.type !== oldWaste.type) {
        throw new BadRequestException('Tidak dapat mengubah jenis barang (type) untuk rekaman ini, harap hapus dan buat baru.');
      }

      const expectedOldItemId = oldWaste.type === waste_type.PRODUCT ? oldWaste.id_katalog_menu : oldWaste.id_ingredient;
      
      if (updateWasteDto.item_id !== undefined && updateWasteDto.item_id !== expectedOldItemId) {
        throw new BadRequestException('Tidak dapat mengubah item referensi (item_id) untuk rekaman ini, harap hapus dan buat baru.');
      }

      let newQuantity = oldWaste.quantity;
      if (isQuantityChanged) {
        newQuantity = updateWasteDto.quantity!;
        const difference = newQuantity - oldWaste.quantity;
        
        let stock_before = 0;
        let stock_after = 0;

        if (oldWaste.type === waste_type.PRODUCT) {
          const product = await tx.katalog_menu.findUnique({ where: { id: oldWaste.id_katalog_menu! } });
          if (!product) throw new NotFoundException('Product tidak ditemukan');
          if (product.stok < difference) throw new BadRequestException('Stok tidak mencukupi untuk update kuantitas.');
          
          stock_before = product.stok;
          stock_after = stock_before - difference;

          await tx.katalog_menu.update({
            where: { id: product.id },
            data: { stok: stock_after }
          });
        } else if (oldWaste.type === waste_type.INGREDIENT) {
          const ingredient = await tx.ingredient.findUnique({ where: { id: oldWaste.id_ingredient! } });
          if (!ingredient) throw new NotFoundException('Ingredient tidak ditemukan');
          if (ingredient.stock < difference) throw new BadRequestException('Stok tidak mencukupi untuk update kuantitas.');
          
          stock_before = ingredient.stock;
          stock_after = stock_before - difference;

          await tx.ingredient.update({
            where: { id: ingredient.id },
            data: { stock: stock_after }
          });
        }

        // update stock_movement or create adjustment? 
        // Best approach is a new ADJUSTMENT stock movement for the Delta.
        await tx.stock_movement.create({
          data: {
            type: stock_movement_type.ADJUSTMENT,
            id_katalog_menu: oldWaste.id_katalog_menu,
            id_ingredient: oldWaste.id_ingredient,
            quantity: -difference,
            stock_before,
            stock_after,
            reference_type: 'WASTE_UPDATE',
            reference_id: oldWaste.id,
            id_waste: oldWaste.id,
            created_by: userId
          }
        });
      }

      const updatedWaste = await tx.waste.update({
        where: { id },
        data: {
          quantity: newQuantity,
          reason: updateWasteDto.reason || oldWaste.reason,
          note: updateWasteDto.note !== undefined ? updateWasteDto.note : oldWaste.note,
          total_loss: oldWaste.cost_per_unit * newQuantity
        }
      });

      return {
        message: 'Barang terbuang berhasil diperbarui',
        data: updatedWaste
      };
    });
  }

  async remove(id: number, userId: number) {
    return await this.prisma.$transaction(async (tx) => {
      const waste = await tx.waste.findUnique({ where: { id } });
      if (!waste) throw new NotFoundException('Barang terbuang tidak ditemukan');

      let stock_before = 0;
      let stock_after = 0;

      // Revert Stock
      if (waste.type === waste_type.PRODUCT) {
        const product = await tx.katalog_menu.findUnique({ where: { id: waste.id_katalog_menu! } });
        if (product) {
          stock_before = product.stok;
          stock_after = stock_before + waste.quantity;
          await tx.katalog_menu.update({
            where: { id: product.id },
            data: { stok: stock_after }
          });
        }
      } else if (waste.type === waste_type.INGREDIENT) {
        const ingredient = await tx.ingredient.findUnique({ where: { id: waste.id_ingredient! } });
        if (ingredient) {
          stock_before = ingredient.stock;
          stock_after = stock_before + waste.quantity;
          await tx.ingredient.update({
             where: { id: ingredient.id },
             data: { stock: stock_after }
          });
        }
      }

      // We maintain the delete as a hard delete since there's no deleted_at in the model we defined.
      // Or we can just delete it and record a REVERSAL stock movement before deleting, but Prisma might ripple delete or throw foreign key error if stock_movement deletes cascade.
      // Wait, we defined stock_movement -> waste without cascading. We need to delete associated stock_movements first.
      await tx.stock_movement.deleteMany({
        where: { id_waste: id }
      });

      await tx.waste.delete({
        where: { id }
      });

      this.logger.log(`Deleted waste record: ${id} and reverted stock by user: ${userId}`);

      return {
        message: 'Barang terbuang berhasil dihapus dan stok dikembalikan',
        data: null
      };
    });
  }
}
