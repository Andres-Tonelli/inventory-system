import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@inventory-system/backend-persistence';
import { CatalogosModule } from './catalogos/catalogos.module';
import { InventarioModule } from './inventario/inventario.module';
import { AsignacionesModule } from './asignaciones/asignaciones.module';
import { EmpleadosModule } from './empleados/empleados.module';
import { AgrupadoresModule } from './agrupadores/agrupadores.module';
import { AuthModule } from './auth/auth.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CatalogosModule,
    InventarioModule,
    AsignacionesModule,
    EmpleadosModule,
    AgrupadoresModule,
    SolicitudesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
