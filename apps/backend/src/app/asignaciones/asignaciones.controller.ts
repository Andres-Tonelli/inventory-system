import { Controller, Post, Patch, Body, Get, Query, Param, UseGuards, ParseIntPipe, Req, ForbiddenException } from '@nestjs/common';
import { AsignacionesService } from '@inventory-system/backend-application';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DomainAdminGuard } from '../auth/domain-admin.guard';
import {
  AsignarArticuloDto,
  AsignarAgrupadorDto,
  AsignarConsumibleDto,
} from './dto/asignaciones.dto';

@Controller('asignaciones')
@UseGuards(JwtAuthGuard, DomainAdminGuard)
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
  async getAsignacionesDeEmpleado(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const user = req.user;
    if (user && user.rol === 'COLABORADOR' && user.empleadoId !== id) {
      throw new ForbiddenException('No tienes permisos para ver las asignaciones de otro empleado');
    }
    const resultados = await this.asignacionesService.getAsignacionesDeEmpleado(id);
    return { success: true, data: resultados };
  }

  @Patch('articulos/:id/devolver')
  async devolverArticulo(@Param('id', ParseIntPipe) id: number) {
    await this.asignacionesService.devolverArticulo(id);
    return { success: true, message: 'Artículo devuelto' };
  }

  @Patch('agrupadores/:id/devolver')
  async devolverAgrupador(@Param('id', ParseIntPipe) id: number) {
    await this.asignacionesService.devolverAgrupador(id);
    return { success: true, message: 'Agrupador devuelto' };
  }
}
