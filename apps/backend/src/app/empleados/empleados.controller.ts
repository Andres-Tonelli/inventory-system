import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Logger } from '@nestjs/common';
import { EmpleadosService } from '@inventory-system/backend-application';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SystemAdminGuard } from '../auth/system-admin.guard';
import { LdapService } from '../auth/ldap.service';
import { PrismaService } from '@inventory-system/backend-persistence';
import {
  CreateAreaDto,
  CreateEmpleadoDto,
  LoginDto,
  UpdateAreaDto,
  UpdateEmpleadoDto,
} from './dto/empleados.dto';

@Controller('empleados')
export class EmpleadosController {
  private readonly logger = new Logger(EmpleadosController.name);

  constructor(
    private readonly empleadosService: EmpleadosService,
    private readonly ldapService: LdapService,
    private readonly prisma: PrismaService,
  ) {}

  // ---- AREAS ----
  @Post('areas')
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  async createArea(@Body() body: CreateAreaDto) {
    await this.empleadosService.createArea(body.nombre);
    return { success: true, message: 'Área creada exitosamente' };
  }

  @Get('areas')
  @UseGuards(JwtAuthGuard)
  async getAreas() {
    const resultados = await this.empleadosService.getAreas();
    return { success: true, data: resultados };
  }

  @Put('areas/:id')
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  async updateArea(@Param('id') id: string, @Body() body: UpdateAreaDto) {
    await this.empleadosService.updateArea(Number(id), body.nombre);
    return { success: true, message: 'Área actualizada' };
  }

  @Delete('areas/:id')
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  async deleteArea(@Param('id') id: string) {
    await this.empleadosService.deleteArea(Number(id));
    return { success: true, message: 'Área eliminada' };
  }

  // ---- EMPLEADOS ----
  @Post()
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  async createEmpleado(@Body() body: CreateEmpleadoDto) {
    await this.empleadosService.createEmpleado(body);
    return { success: true, message: 'Empleado registrado exitosamente' };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getEmpleados(
    @Query('legajo') legajo?: string,
    @Query('nombre') nombre?: string,
    @Query('areaId') areaId?: number,
  ) {
    try {
      const adMembers = await this.ldapService.getGroupMembers();
      for (const member of adMembers) {
        let matchedAreaId = 1; // Fallback area
        if (member.area) {
          const areaObj = await this.prisma.area.upsert({
            where: { nombre: member.area },
            update: {},
            create: { nombre: member.area }
          });
          matchedAreaId = areaObj.id;
        }

        await this.prisma.empleado.upsert({
          where: { legajo: member.username },
          update: { nombre: member.nombre, areaId: matchedAreaId },
          create: { legajo: member.username, nombre: member.nombre, areaId: matchedAreaId }
        });
      }
    } catch (err: any) {
      this.logger.error(`Error al sincronizar empleados de AD/LDAP: ${err.message}`);
    }

    const resultados = await this.empleadosService.getEmpleados({ legajo, nombre, areaId });
    return { success: true, data: resultados };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
  async updateEmpleado(@Param('id') id: string, @Body() body: UpdateEmpleadoDto) {
    await this.empleadosService.updateEmpleado(Number(id), body);
    return { success: true, message: 'Empleado actualizado' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, SystemAdminGuard)
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
