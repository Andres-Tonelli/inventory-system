import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Req, BadRequestException, ParseIntPipe } from '@nestjs/common';
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
  @Post('categorias/:categoriaId/atributos')
  async createAtributo(@Param('categoriaId', ParseIntPipe) categoriaId: number, @Body() body: CreateAtributoDto) {
    await this.catalogosService.createAtributo({ ...body, categoriaId: categoriaId });
    return { success: true, message: 'Atributo dinámico creado exitosamente' };
  }

  @Get('dominios/:dominioId/atributos')
  async getAtributosPorDominio(@Param('dominioId', ParseIntPipe) dominioId: number) {
    const resultados = await this.catalogosService.getAtributosPorDominio(dominioId);
    return { success: true, data: resultados };
  }

  @Get('categorias/:categoriaId/atributos')
  async getAtributosPorCategoria(@Param('categoriaId', ParseIntPipe) categoriaId: number) {
    const resultados = await this.catalogosService.getAtributosPorCategoria(categoriaId);
    return { success: true, data: resultados };
  }

  // ---- TIPOS DE AGRUPADOR ----
  @Post('dominios/:dominioId/tipos-agrupador')
  async createTipoAgrupador(@Param('dominioId', ParseIntPipe) dominioId: number, @Body() body: CreateTipoAgrupadorDto) {
    await this.catalogosService.createTipoAgrupador({ ...body, dominioId: dominioId });
    return { success: true, message: 'Tipo de agrupador creado exitosamente' };
  }

  @Get('dominios/:dominioId/tipos-agrupador')
  async getTiposAgrupador(@Param('dominioId', ParseIntPipe) dominioId: number) {
    const resultados = await this.catalogosService.getTiposAgrupador(dominioId);
    return { success: true, data: resultados };
  }

  // ---- ESTADOS DE ARTÍCULO ----
  @Post('estados')
  async createEstado(@Body() body: CreateEstadoDto) {
    await this.catalogosService.createEstado(body.nombre, body.dominioId, body.codigo);
    return { success: true, message: 'Estado de artículo creado exitosamente' };
  }

  @Get('estados')
  async getEstados(@Query('dominioId', ParseIntPipe) dominioId: number) {
    const resultados = await this.catalogosService.getEstados(dominioId);
    return { success: true, data: resultados };
  }

  // ---- UPDATE / DELETE (config de dominios) ----
  @Put('categorias/:id')
  async updateCategoria(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCategoriaDto) {
    await this.catalogosService.updateCategoria(id, body);
    return { success: true, message: 'Categoría actualizada' };
  }

  @Put('marcas/:id')
  async updateMarca(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateMarcaDto) {
    await this.catalogosService.updateMarca(id, body.nombre);
    return { success: true, message: 'Marca actualizada' };
  }

  @Put('modelos/:id')
  async updateModelo(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateModeloDto) {
    await this.catalogosService.updateModelo(id, body);
    return { success: true, message: 'Modelo actualizado' };
  }

  @Put('dominios/:id')
  @UseGuards(SystemAdminGuard)
  async updateDominio(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateDominioDto) {
    await this.catalogosService.updateDominio(id, body);
    return { success: true, message: 'Dominio actualizado' };
  }

  @Delete('dominios/:id')
  @UseGuards(SystemAdminGuard)
  async deleteDominio(@Param('id', ParseIntPipe) id: number) {
    await this.catalogosService.deleteDominio(id);
    return { success: true, message: 'Dominio eliminado' };
  }

  @Put('tipos-agrupador/:id')
  async updateTipoAgrupador(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateTipoAgrupadorDto) {
    await this.catalogosService.updateTipoAgrupador(id, body);
    return { success: true, message: 'Tipo de agrupador actualizado' };
  }

  @Delete('tipos-agrupador/:id')
  async deleteTipoAgrupador(@Param('id', ParseIntPipe) id: number) {
    await this.catalogosService.deleteTipoAgrupador(id);
    return { success: true, message: 'Tipo de agrupador eliminado' };
  }

  @Put('atributos/:id')
  async updateAtributo(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateAtributoDto) {
    await this.catalogosService.updateAtributo(id, body);
    return { success: true, message: 'Atributo actualizado' };
  }

  @Delete('atributos/:id')
  async deleteAtributo(@Param('id', ParseIntPipe) id: number) {
    await this.catalogosService.deleteAtributo(id);
    return { success: true, message: 'Atributo eliminado' };
  }

  @Put('estados/:id')
  async updateEstado(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateEstadoDto) {
    await this.catalogosService.updateEstado(id, body.nombre);
    return { success: true, message: 'Estado actualizado' };
  }

  @Delete('categorias/:id')
  async deleteCategoria(@Param('id', ParseIntPipe) id: number) {
    await this.catalogosService.deleteCategoria(id);
    return { success: true, message: 'Categoría eliminada' };
  }

  @Delete('marcas/:id')
  async deleteMarca(@Param('id', ParseIntPipe) id: number) {
    await this.catalogosService.deleteMarca(id);
    return { success: true, message: 'Marca eliminada' };
  }

  @Delete('modelos/:id')
  async deleteModelo(@Param('id', ParseIntPipe) id: number) {
    await this.catalogosService.deleteModelo(id);
    return { success: true, message: 'Modelo eliminado' };
  }

  @Delete('estados/:id')
  async deleteEstado(@Param('id', ParseIntPipe) id: number) {
    await this.catalogosService.deleteEstado(id);
    return { success: true, message: 'Estado eliminado' };
  }
}
