import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { EmpleadosService } from '@inventory-system/backend-application';
import {
  CreateAreaDto,
  CreateEmpleadoDto,
  LoginDto,
  UpdateAreaDto,
  UpdateEmpleadoDto,
} from './dto/empleados.dto';

@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  // ---- AREAS ----
  @Post('areas')
  async createArea(@Body() body: CreateAreaDto) {
    await this.empleadosService.createArea(body.nombre);
    return { success: true, message: 'Área creada exitosamente' };
  }

  @Get('areas')
  async getAreas() {
    const resultados = await this.empleadosService.getAreas();
    return { success: true, data: resultados };
  }

  @Put('areas/:id')
  async updateArea(@Param('id') id: string, @Body() body: UpdateAreaDto) {
    await this.empleadosService.updateArea(Number(id), body.nombre);
    return { success: true, message: 'Área actualizada' };
  }

  @Delete('areas/:id')
  async deleteArea(@Param('id') id: string) {
    await this.empleadosService.deleteArea(Number(id));
    return { success: true, message: 'Área eliminada' };
  }

  // ---- EMPLEADOS ----
  @Post()
  async createEmpleado(@Body() body: CreateEmpleadoDto) {
    await this.empleadosService.createEmpleado(body);
    return { success: true, message: 'Empleado registrado exitosamente' };
  }

  @Get()
  async getEmpleados(
    @Query('legajo') legajo?: string,
    @Query('nombre') nombre?: string,
    @Query('areaId') areaId?: number,
  ) {
    const resultados = await this.empleadosService.getEmpleados({ legajo, nombre, areaId });
    return { success: true, data: resultados };
  }

  @Put(':id')
  async updateEmpleado(@Param('id') id: string, @Body() body: UpdateEmpleadoDto) {
    await this.empleadosService.updateEmpleado(Number(id), body);
    return { success: true, message: 'Empleado actualizado' };
  }

  @Delete(':id')
  async deleteEmpleado(@Param('id') id: string) {
    await this.empleadosService.deleteEmpleado(Number(id));
    return { success: true, message: 'Empleado eliminado' };
  }

  // ---- AUTH "SOFT" ----
  @Post('login')
  async login(@Body() body: LoginDto) {
    const empleado = await this.empleadosService.login(body.legajo);
    return { success: true, message: 'Login exitoso', data: empleado };
  }
}
