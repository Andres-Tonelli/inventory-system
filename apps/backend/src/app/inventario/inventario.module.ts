import { Module } from '@nestjs/common';
import { InventarioController } from './inventario.controller';
import { InventarioService } from '@inventory-system/backend-application';

// Los repositorios se proveen globalmente desde PrismaModule (ver ADR-0005).
@Module({
  controllers: [InventarioController],
  providers: [InventarioService],
})
export class InventarioModule {}
