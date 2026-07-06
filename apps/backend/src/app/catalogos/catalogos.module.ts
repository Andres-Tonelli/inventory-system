import { Module } from '@nestjs/common';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from '@inventory-system/backend-application';

// Los repositorios se proveen globalmente desde PrismaModule (ver ADR-0005).
@Module({
  controllers: [CatalogosController],
  providers: [CatalogosService],
})
export class CatalogosModule {}
