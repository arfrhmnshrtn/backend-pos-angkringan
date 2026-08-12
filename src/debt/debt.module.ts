import { Module } from '@nestjs/common';
import { DebtController } from './controllers/debt.controller.js';
import { DebtService } from './services/debt.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [DebtController],
  providers: [DebtService],
  exports: [DebtService],
})
export class DebtModule {}
