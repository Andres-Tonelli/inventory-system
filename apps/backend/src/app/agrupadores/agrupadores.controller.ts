import { Controller, Get, Post, Body, Param, Query, Delete, UseGuards } from '@nestjs/common';
import { AgrupadoresService } from '@inventory-system/backend-application';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DomainAdminGuard } from '../auth/domain-admin.guard';
import {
  CreateAgrupadorDto,
  AddArticuloAgrupadorDto,
  AddSubAgrupadorDto,
} from './dto/agrupadores.dto';

@Controller('agrupadores')
@UseGuards(JwtAuthGuard, DomainAdminGuard)
export class AgrupadoresController {
  constructor(private readonly agrupadoresService: AgrupadoresService) {}

  @Post()
  async create(@Body() body: CreateAgrupadorDto) {
    const res = await this.agrupadoresService.create(body);
    return { success: true, data: res };
  }

  @Get()
  async getAgrupadores(
    @Query('dominioId') dominioId?: number,
    @Query('tipoAgrupadorId') tipoAgrupadorId?: number,
  ) {
    const data = await this.agrupadoresService.findAll(dominioId, tipoAgrupadorId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.agrupadoresService.findOne(+id);
    return { success: true, data: res };
  }

  @Post(':id/articulos')
  async addArticulo(@Param('id') id: string, @Body() body: AddArticuloAgrupadorDto) {
    await this.agrupadoresService.addArticulo(+id, body.articuloId);
    return { success: true, message: 'Artículo agregado al agrupador' };
  }

  @Delete('articulos/:articuloId')
  async removeArticulo(
    @Param('articuloId') articuloId: string,
    @Query('nuevoEstadoCodigo') nuevoEstadoCodigo?: string
  ) {
    await this.agrupadoresService.removeArticulo(+articuloId, nuevoEstadoCodigo);
    return { success: true, message: 'Artículo removido del agrupador' };
  }

  @Post(':id/subagrupadores')
  async addSubAgrupador(@Param('id') id: string, @Body() body: AddSubAgrupadorDto) {
    await this.agrupadoresService.addSubAgrupador(+id, body.childAgrupadorId);
    return { success: true, message: 'Sub-agrupador agregado exitosamente' };
  }

  @Delete('subagrupadores/:childAgrupadorId')
  async removeSubAgrupador(@Param('childAgrupadorId') childAgrupadorId: string) {
    await this.agrupadoresService.removeSubAgrupador(+childAgrupadorId);
    return { success: true, message: 'Sub-agrupador removido exitosamente' };
  }
}
