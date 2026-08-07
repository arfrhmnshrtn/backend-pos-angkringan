import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller.js';
import { RolesService } from './services/roles.service.js';

@Module({
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
