import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { PrismaService } from '@inventory-system/backend-persistence';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SystemAdminGuard } from './system-admin.guard';

@Controller('auth')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdministradoresController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dominios/:dominioId/administradores')
  async getAdministradores(@Param('dominioId') dominioId: string) {
    const admins = await this.prisma.administrador.findMany({
      where: {
        dominios: {
          some: {
            dominioId: Number(dominioId),
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
    @Param('dominioId') dominioId: string,
    @Body() body: { username: string; nombre: string; rol?: 'DOMINIO' | 'SISTEMA' }
  ) {
    const rol = body.rol || 'DOMINIO';

    // 1. Create or update the administrator
    const admin = await this.prisma.administrador.upsert({
      where: { username: body.username },
      update: { nombre: body.nombre, rol },
      create: { username: body.username, nombre: body.nombre, rol },
    });

    // 2. If it's a domain admin, link it to the domain
    if (rol === 'DOMINIO') {
      await this.prisma.administradorDominio.upsert({
        where: {
          administradorId_dominioId: {
            administradorId: admin.id,
            dominioId: Number(dominioId),
          },
        },
        update: {},
        create: {
          administradorId: admin.id,
          dominioId: Number(dominioId),
        },
      });
    }

    return { success: true, message: 'Administrador asociado exitosamente al dominio' };
  }

  @Delete('dominios/:dominioId/administradores/:adminId')
  async desvincularAdministrador(
    @Param('dominioId') dominioId: string,
    @Param('adminId') adminId: string
  ) {
    await this.prisma.administradorDominio.delete({
      where: {
        administradorId_dominioId: {
          administradorId: Number(adminId),
          dominioId: Number(dominioId),
        },
      },
    });

    return { success: true, message: 'Administrador desvinculado exitosamente del dominio' };
  }
}
