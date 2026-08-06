import { Controller, Post, Get, Patch, Body, Query, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSolicitudDto, ResolverSolicitudDto } from './dto/solicitudes.dto';

@Controller('solicitudes')
@UseGuards(JwtAuthGuard)
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  async create(@Body() body: CreateSolicitudDto, @Req() req: any) {
    const user = req.user;
    return this.solicitudesService.create(user.empleadoId, body);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('dominioId') dominioId?: string,
    @Query('empleadoId') empleadoId?: string
  ) {
    const filters = {
      dominioId: dominioId ? Number(dominioId) : undefined,
      empleadoId: empleadoId ? Number(empleadoId) : undefined
    };
    const resultados = await this.solicitudesService.findAll(req.user, filters);
    return { success: true, data: resultados };
  }

  @Patch(':id/resolver')
  async resolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ResolverSolicitudDto,
    @Req() req: any
  ) {
    const resultado = await this.solicitudesService.resolver(id, req.user, body);
    return { success: true, message: 'Solicitud resuelta con éxito', data: resultado };
  }
}
