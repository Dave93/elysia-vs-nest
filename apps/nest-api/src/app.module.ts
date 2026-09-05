import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module.js';
import { SystemController } from './system/system.controller.js';
import { UsersController } from './users/users.controller.js';
import { OrdersController } from './orders/orders.controller.js';

@Module({
  imports: [DbModule],
  controllers: [SystemController, UsersController, OrdersController],
})
export class AppModule {}
