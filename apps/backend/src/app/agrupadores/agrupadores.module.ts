import { Module } from '@nestjs/common';
import { AgrupadoresController } from './agrupadores.controller';
import { AgrupadoresService } from '@inventory-system/backend-application';
import { PrismaModule } from '@inventory-system/backend-persistence';

@Module({
  imports: [PrismaModule],
  controllers: [AgrupadoresController],
  providers: [AgrupadoresService],
  exports: [AgrupadoresService]
})
export class AgrupadoresModule {}
