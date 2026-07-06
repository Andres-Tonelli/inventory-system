import { Module } from '@nestjs/common';
import { EmpleadosController } from './empleados.controller';
import { EmpleadosService } from '@inventory-system/backend-application';

// Los repositorios se proveen globalmente desde PrismaModule (ver ADR-0005).
@Module({
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
})
export class EmpleadosModule {}
