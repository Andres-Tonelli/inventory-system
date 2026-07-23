import { Controller, Get, Post, Patch, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { InventarioService } from '@inventory-system/backend-application';
import { CreateArticuloDto, CreateLoteDto, AjusteStockDto, UpdateEstadoArticuloDto, UpdateArticuloDto } from './dto/inventario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DomainAdminGuard } from '../auth/domain-admin.guard';

@Controller('inventario')
@UseGuards(JwtAuthGuard, DomainAdminGuard)
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Post('articulos')
  async createArticulo(@Body() body: CreateArticuloDto) {
    await this.inventarioService.createArticulo(body);
    return { success: true, message: 'Artículo registrado exitosamente en el inventario' };
  }

  @Put('articulos/:id')
  async actualizarArticulo(@Param('id') id: string, @Body() body: UpdateArticuloDto) {
    await this.inventarioService.actualizarArticulo(Number(id), body);
    return { success: true, message: 'Artículo actualizado' };
  }

  @Patch('articulos/:id/estado')
  async cambiarEstado(@Param('id') id: string, @Body() body: UpdateEstadoArticuloDto) {
    await this.inventarioService.cambiarEstadoArticulo(Number(id), body.estadoCodigo);
    return { success: true, message: 'Estado del artículo actualizado' };
  }

  @Get('articulos')
  async getArticulos(
    @Query('modeloId') modeloId?: number,
    @Query('estado') estado?: string,
    @Query('dominioId') dominioId?: number,
    @Query('categoriaId') categoriaId?: number,
  ) {
    const resultados = await this.inventarioService.getArticulos({ modeloId, estado, dominioId, categoriaId });
    return { success: true, data: resultados };
  }

  // --- LOTES ---
  @Post('lotes')
  async createLote(@Body() body: CreateLoteDto) {
    await this.inventarioService.createLote(body);
    return { success: true, message: 'Lote registrado exitosamente' };
  }

  @Get('lotes')
  async getLotes(@Query('modeloId') modeloId?: number, @Query('dominioId') dominioId?: number) {
    const resultados = await this.inventarioService.getLotes({ modeloId, dominioId });
    return { success: true, data: resultados };
  }

  @Post('lotes/:id/consumir')
  async consumirLote(@Param('id') id: string, @Body() body: AjusteStockDto) {
    await this.inventarioService.consumirLote(Number(id), body.cantidad);
    return { success: true, message: 'Unidades consumidas exitosamente' };
  }

  @Post('lotes/:id/adicionar')
  async adicionarStock(@Param('id') id: string, @Body() body: AjusteStockDto) {
    await this.inventarioService.adicionarStock(Number(id), body.cantidad);
    return { success: true, message: 'Unidades adicionadas exitosamente' };
  }
}
