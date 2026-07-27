import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { CatalogosService } from '@inventory-system/backend-application';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DomainAdminGuard } from '../auth/domain-admin.guard';
import { SystemAdminGuard } from '../auth/system-admin.guard';
import {
  CreateAtributoDto,
  CreateCategoriaDto,
  CreateDominioDto,
  CreateEstadoDto,
  CreateMarcaDto,
  CreateModeloDto,
  CreateTipoAgrupadorDto,
  UpdateDominioDto,
  UpdateCategoriaDto,
  UpdateMarcaDto,
  UpdateModeloDto,
  UpdateTipoAgrupadorDto,
  UpdateAtributoDto,
  UpdateEstadoDto,
} from './dto/catalogos.dto';

@Controller('catalogos')
@UseGuards(JwtAuthGuard, DomainAdminGuard)
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Post('dominios')
  @UseGuards(SystemAdminGuard)
  async createDominio(@Body() body: CreateDominioDto) {
    await this.catalogosService.createDominio(body);
    return { success: true, message: 'Dominio de inventario creado exitosamente' };
  }

  @Get('dominios')
  async getDominios(@Req() req: any, @Query('nombre') nombre?: string) {
    const user = req.user;
    let resultados = await this.catalogosService.getDominios({ nombre });
    
    if (user && user.rol !== 'SISTEMA') {
      resultados = resultados.filter((d: any) => user.dominios && user.dominios.includes(d.id));
    }
    
    return { success: true, data: resultados };
  }

  // ---- CATEGORIAS ----
  @Post('categorias')
  async createCategoria(@Body() body: CreateCategoriaDto) {
    await this.catalogosService.createCategoria(body);
    return { success: true, message: 'Categoría creada exitosamente' };
  }

  @Get('categorias')
  async getCategorias(@Query('nombre') nombre?: string, @Query('dominioId') dominioId?: number) {
    const resultados = await this.catalogosService.getCategorias({ nombre, dominioId });
    return { success: true, data: resultados };
  }

  // ---- MARCAS ----
  @Post('marcas')
  async createMarca(@Body() body: CreateMarcaDto) {
    await this.catalogosService.createMarca(body);
    return { success: true, message: 'Marca creada exitosamente' };
  }

  @Get('marcas')
  async getMarcas(@Query('nombre') nombre?: string, @Query('dominioId') dominioId?: number) {
    const resultados = await this.catalogosService.getMarcas({ nombre, dominioId });
    return { success: true, data: resultados };
  }

  // ---- MODELOS ----
  @Post('modelos')
  async createModelo(@Body() body: CreateModeloDto) {
    await this.catalogosService.createModelo(body);
    return { success: true, message: 'Modelo creado exitosamente' };
  }

  @Get('modelos')
  async getModelos(
    @Query('nombre') nombre?: string,
    @Query('marcaId') marcaId?: number,
    @Query('categoriaId') categoriaId?: number,
    @Query('dominioId') dominioId?: number,
  ) {
    const resultados = await this.catalogosService.getModelos({ nombre, marcaId, categoriaId, dominioId });
    return { success: true, data: resultados };
  }

  // ---- ATRIBUTOS DINÁMICOS ----
  @Post('dominios/:dominioId/atributos')
  async createAtributo(@Param('dominioId') dominioId: string, @Body() body: CreateAtributoDto) {
    await this.catalogosService.createAtributo({ ...body, dominioId: Number(dominioId) });
    return { success: true, message: 'Atributo dinámico creado exitosamente' };
  }

  @Get('dominios/:dominioId/atributos')
  async getAtributos(@Param('dominioId') dominioId: string) {
    const resultados = await this.catalogosService.getAtributos(Number(dominioId));
    return { success: true, data: resultados };
  }

  // ---- TIPOS DE AGRUPADOR ----
  @Post('dominios/:dominioId/tipos-agrupador')
  async createTipoAgrupador(@Param('dominioId') dominioId: string, @Body() body: CreateTipoAgrupadorDto) {
    await this.catalogosService.createTipoAgrupador({ ...body, dominioId: Number(dominioId) });
    return { success: true, message: 'Tipo de agrupador creado exitosamente' };
  }

  @Get('dominios/:dominioId/tipos-agrupador')
  async getTiposAgrupador(@Param('dominioId') dominioId: string) {
    const resultados = await this.catalogosService.getTiposAgrupador(Number(dominioId));
    return { success: true, data: resultados };
  }

  // ---- ESTADOS DE ARTÍCULO ----
  @Post('estados')
  async createEstado(@Body() body: CreateEstadoDto) {
    await this.catalogosService.createEstado(body.nombre, body.codigo);
    return { success: true, message: 'Estado de artículo creado exitosamente' };
  }

  @Get('estados')
  async getEstados() {
    const resultados = await this.catalogosService.getEstados();
    return { success: true, data: resultados };
  }

  // ---- UPDATE / DELETE (config de dominios) ----
  @Put('categorias/:id')
  async updateCategoria(@Param('id') id: string, @Body() body: UpdateCategoriaDto) {
    await this.catalogosService.updateCategoria(Number(id), body);
    return { success: true, message: 'Categoría actualizada' };
  }

  @Put('marcas/:id')
  async updateMarca(@Param('id') id: string, @Body() body: UpdateMarcaDto) {
    await this.catalogosService.updateMarca(Number(id), body.nombre);
    return { success: true, message: 'Marca actualizada' };
  }

  @Put('modelos/:id')
  async updateModelo(@Param('id') id: string, @Body() body: UpdateModeloDto) {
    await this.catalogosService.updateModelo(Number(id), body);
    return { success: true, message: 'Modelo actualizado' };
  }

  @Put('dominios/:id')
  @UseGuards(SystemAdminGuard)
  async updateDominio(@Param('id') id: string, @Body() body: UpdateDominioDto) {
    await this.catalogosService.updateDominio(Number(id), body);
    return { success: true, message: 'Dominio actualizado' };
  }

  @Delete('dominios/:id')
  @UseGuards(SystemAdminGuard)
  async deleteDominio(@Param('id') id: string) {
    await this.catalogosService.deleteDominio(Number(id));
    return { success: true, message: 'Dominio eliminado' };
  }

  @Put('tipos-agrupador/:id')
  async updateTipoAgrupador(@Param('id') id: string, @Body() body: UpdateTipoAgrupadorDto) {
    await this.catalogosService.updateTipoAgrupador(Number(id), body);
    return { success: true, message: 'Tipo de agrupador actualizado' };
  }

  @Delete('tipos-agrupador/:id')
  async deleteTipoAgrupador(@Param('id') id: string) {
    await this.catalogosService.deleteTipoAgrupador(Number(id));
    return { success: true, message: 'Tipo de agrupador eliminado' };
  }

  @Put('atributos/:id')
  async updateAtributo(@Param('id') id: string, @Body() body: UpdateAtributoDto) {
    await this.catalogosService.updateAtributo(Number(id), body);
    return { success: true, message: 'Atributo actualizado' };
  }

  @Delete('atributos/:id')
  async deleteAtributo(@Param('id') id: string) {
    await this.catalogosService.deleteAtributo(Number(id));
    return { success: true, message: 'Atributo eliminado' };
  }

  @Put('estados/:id')
  async updateEstado(@Param('id') id: string, @Body() body: UpdateEstadoDto) {
    await this.catalogosService.updateEstado(Number(id), body.nombre);
    return { success: true, message: 'Estado actualizado' };
  }

  @Delete('estados/:id')
  async deleteEstado(@Param('id') id: string) {
    await this.catalogosService.deleteEstado(Number(id));
    return { success: true, message: 'Estado eliminado' };
  }
}
