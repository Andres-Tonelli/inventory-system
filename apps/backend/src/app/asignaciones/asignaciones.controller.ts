import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { AsignacionesService } from '@inventory-system/backend-application';
import {
  AsignarArticuloDto,
  AsignarAgrupadorDto,
  AsignarConsumibleDto,
} from './dto/asignaciones.dto';

@Controller('asignaciones')
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  @Post('articulos')
  async asignarArticulo(@Body() body: AsignarArticuloDto) {
    await this.asignacionesService.asignarArticulo(body.articuloId, body.empleadoId, body.observaciones);
    return { success: true, message: 'Artículo asignado exitosamente' };
  }

  @Post('agrupadores')
  async asignarAgrupador(@Body() body: AsignarAgrupadorDto) {
    await this.asignacionesService.asignarAgrupador(body.agrupadorId, body.empleadoId, body.observaciones);
    return { success: true, message: 'Agrupador asignado exitosamente' };
  }

  @Post('consumibles')
  async asignarConsumible(@Body() body: AsignarConsumibleDto) {
    await this.asignacionesService.asignarConsumible(body.loteId, body.empleadoId, body.cantidad);
    return { success: true, message: 'Consumible asignado exitosamente' };
  }

  @Get()
  async getAsignaciones(@Query('dominioId') dominioId?: string) {
    const resultados = await this.asignacionesService.getAsignaciones(dominioId ? Number(dominioId) : undefined);
    return { success: true, data: resultados };
  }

  @Get('empleado/:id')
  async getAsignacionesDeEmpleado(@Param('id') id: string) {
    const resultados = await this.asignacionesService.getAsignacionesDeEmpleado(Number(id));
    return { success: true, data: resultados };
  }
}
