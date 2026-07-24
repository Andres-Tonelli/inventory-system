import { Module } from '@nestjs/common';
import { EmpleadosController } from './empleados.controller';
import { EmpleadosService } from '@inventory-system/backend-application';

import { AuthModule } from '../auth/auth.module';

// Los repositorios se proveen globalmente desde PrismaModule (ver ADR-0005).
@Module({
  imports: [AuthModule],
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
})
export class EmpleadosModule {}
