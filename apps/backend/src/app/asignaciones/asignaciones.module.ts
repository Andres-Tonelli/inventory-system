import { Module } from '@nestjs/common';
import { AsignacionesController } from './asignaciones.controller';
import { AsignacionesService } from '@inventory-system/backend-application';
import { PrismaModule } from '@inventory-system/backend-persistence';

@Module({
  imports: [PrismaModule],
  controllers: [AsignacionesController],
  providers: [AsignacionesService],
})
export class AsignacionesModule {}
