import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';

@Module({
  imports: [OrdersModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
