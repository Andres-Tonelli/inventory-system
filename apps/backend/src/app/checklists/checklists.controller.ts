import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DomainAdminGuard } from '../auth/domain-admin.guard';
import { CreateAspectoDto, CreateChecklistDto, CreateChecklistInstanciaDto } from './dto/checklists.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  // --- ASPECTOS ---
  @Get('catalogos/dominios/:dominioId/aspectos')
  async getAspectos(@Param('dominioId', ParseIntPipe) dominioId: number) {
    const res = await this.checklistsService.getAspectos(dominioId);
    return { success: true, data: res };
  }

  @Post('catalogos/dominios/:dominioId/aspectos')
  @UseGuards(DomainAdminGuard)
  async createAspecto(
    @Param('dominioId', ParseIntPipe) dominioId: number,
    @Body() dto: CreateAspectoDto
  ) {
    const res = await this.checklistsService.createAspecto(dominioId, dto);
    return { success: true, message: 'Aspecto creado con éxito.', data: res };
  }

  @Delete('catalogos/dominios/:dominioId/aspectos/:id')
  @UseGuards(DomainAdminGuard)
  async deleteAspecto(@Param('id', ParseIntPipe) id: number) {
    await this.checklistsService.deleteAspecto(id);
    return { success: true, message: 'Aspecto eliminado con éxito.' };
  }

  // --- CHECKLISTS ---
  @Get('checklists')
  async getChecklists(
    @Query('dominioId') dominioId?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('tipoAgrupadorId') tipoAgrupadorId?: string,
    @Query('ambito') ambito?: string
  ) {
    const filters = {
      dominioId: dominioId ? Number(dominioId) : undefined,
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
      tipoAgrupadorId: tipoAgrupadorId ? Number(tipoAgrupadorId) : undefined,
      ambito
    };
    const res = await this.checklistsService.getChecklists(filters);
    return { success: true, data: res };
  }

  @Post('checklists')
  @UseGuards(DomainAdminGuard)
  async createChecklist(@Body() dto: CreateChecklistDto) {
    const res = await this.checklistsService.createChecklist(dto);
    return { success: true, message: 'Checklist creado con éxito.', data: res };
  }

  @Put('checklists/:id')
  @UseGuards(DomainAdminGuard)
  async updateChecklist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateChecklistDto
  ) {
    const res = await this.checklistsService.updateChecklist(id, dto);
    return { success: true, message: 'Checklist actualizado con éxito.', data: res };
  }

  @Delete('checklists/:id')
  @UseGuards(DomainAdminGuard)
  async deleteChecklist(@Param('id', ParseIntPipe) id: number) {
    await this.checklistsService.deleteChecklist(id);
    return { success: true, message: 'Checklist eliminado con éxito.' };
  }

  // --- INSTANCIAS ---
  @Get('checklists/instancias')
  async getChecklistInstancias(
    @Query('articuloId') articuloId?: string,
    @Query('agrupadorId') agrupadorId?: string,
    @Query('dominioId') dominioId?: string,
    @Query('checklistId') checklistId?: string,
    @Query('responsable') responsable?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string
  ) {
    const filters = {
      articuloId: articuloId ? Number(articuloId) : undefined,
      agrupadorId: agrupadorId ? Number(agrupadorId) : undefined,
      dominioId: dominioId ? Number(dominioId) : undefined,
      checklistId: checklistId ? Number(checklistId) : undefined,
      responsable,
      fechaDesde,
      fechaHasta
    };
    const res = await this.checklistsService.getChecklistInstancias(filters);
    return { success: true, data: res };
  }

  @Get('checklists/instancias/:id')
  async getChecklistInstanciaById(@Param('id', ParseIntPipe) id: number) {
    const res = await this.checklistsService.getChecklistInstanciaById(id);
    return { success: true, data: res };
  }

  @Post('checklists/instancias')
  async createChecklistInstancia(@Body() dto: CreateChecklistInstanciaDto) {
    const res = await this.checklistsService.createChecklistInstancia(dto);
    return { success: true, message: 'Control de checklist registrado con éxito.', data: res };
  }
}
