import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpCode, ParseIntPipe } from '@nestjs/common';
import { PrismaService } from '@inventory-system/backend-persistence';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SystemAdminGuard } from './system-admin.guard';

@Controller('auth')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdministradoresController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dominios/:dominioId/administradores')
  async getAdministradores(@Param('dominioId', ParseIntPipe) dominioId: number) {
    const admins = await this.prisma.administrador.findMany({
      where: {
        dominios: {
          some: {
            dominioId: dominioId,
          },
        },
      },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
      },
    });

    return { success: true, data: admins };
  }

  @Post('dominios/:dominioId/administradores')
  @HttpCode(HttpStatus.OK)
  async asociarAdministrador(
    @Param('dominioId', ParseIntPipe) dominioId: number,
    @Body() body: { username: string; nombre: string; rol?: 'DOMINIO' | 'SISTEMA' }
  ) {
    const rol = body.rol || 'DOMINIO';
    const normalizedUsername = body.username.toLowerCase().trim();

    // 1. Create or update the administrator
    const admin = await this.prisma.administrador.upsert({
      where: { username: normalizedUsername },
      update: { nombre: body.nombre, rol },
      create: { username: normalizedUsername, nombre: body.nombre, rol },
    });

    // 2. If it's a domain admin, link it to the domain
    if (rol === 'DOMINIO') {
      await this.prisma.administradorDominio.upsert({
        where: {
          administradorId_dominioId: {
            administradorId: admin.id,
            dominioId: dominioId,
          },
        },
        update: {},
        create: {
          administradorId: admin.id,
          dominioId: dominioId,
        },
      });
    }

    return { success: true, message: 'Administrador asociado exitosamente al dominio' };
  }

  @Delete('dominios/:dominioId/administradores/:adminId')
  async desvincularAdministrador(
    @Param('dominioId', ParseIntPipe) dominioId: number,
    @Param('adminId', ParseIntPipe) adminId: number
  ) {
    await this.prisma.administradorDominio.delete({
      where: {
        administradorId_dominioId: {
          administradorId: adminId,
          dominioId: dominioId,
        },
      },
    });

    return { success: true, message: 'Administrador desvinculado exitosamente del dominio' };
  }

  // ==== GLOBAL ADMINISTRATORS CRUD ====

  @Get('administradores')
  async getAllAdministradores() {
    const admins = await this.prisma.administrador.findMany({
      include: {
        dominios: {
          include: {
            dominio: true,
          },
        },
      },
      orderBy: {
        username: 'asc',
      },
    });
    return { success: true, data: admins };
  }

  @Post('administradores')
  @HttpCode(HttpStatus.OK)
  async createAdministrador(
    @Body() body: { username: string; nombre: string; rol: 'DOMINIO' | 'SISTEMA'; dominios?: number[] }
  ) {
    const rol = body.rol || 'DOMINIO';
    const normalizedUsername = body.username.toLowerCase().trim();

    // 1. Create or update the admin record
    const admin = await this.prisma.administrador.upsert({
      where: { username: normalizedUsername },
      update: { nombre: body.nombre, rol },
      create: { username: normalizedUsername, nombre: body.nombre, rol },
    });

    // 2. Clear old domain connections
    await this.prisma.administradorDominio.deleteMany({
      where: { administradorId: admin.id },
    });

    // 3. Link new domains if it's DOMINIO
    if (rol === 'DOMINIO' && body.dominios && body.dominios.length > 0) {
      await this.prisma.administradorDominio.createMany({
        data: body.dominios.map((domId) => ({
          administradorId: admin.id,
          dominioId: Number(domId),
        })),
      });
    }

    return { success: true, message: 'Administrador creado con éxito' };
  }

  @Put('administradores/:id')
  async updateAdministrador(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre: string; rol: 'DOMINIO' | 'SISTEMA'; dominios?: number[] }
  ) {
    const adminId = id;

    // 1. Update basic admin data
    await this.prisma.administrador.update({
      where: { id: adminId },
      data: { nombre: body.nombre, rol: body.rol },
    });

    // 2. Clear old domain mappings
    await this.prisma.administradorDominio.deleteMany({
      where: { administradorId: adminId },
    });

    // 3. Connect new domains if role is DOMINIO
    if (body.rol === 'DOMINIO' && body.dominios && body.dominios.length > 0) {
      await this.prisma.administradorDominio.createMany({
        data: body.dominios.map((domId) => ({
          administradorId: adminId,
          dominioId: Number(domId),
        })),
      });
    }

    return { success: true, message: 'Administrador actualizado con éxito' };
  }

  @Delete('administradores/:id')
  async deleteAdministrador(@Param('id', ParseIntPipe) id: number) {
    const adminId = id;

    // Delete relations first to satisfy FK constraints in standard DB setups
    await this.prisma.administradorDominio.deleteMany({
      where: { administradorId: adminId },
    });

    await this.prisma.administrador.delete({
      where: { id: adminId },
    });

    return { success: true, message: 'Administrador eliminado con éxito' };
  }
}
