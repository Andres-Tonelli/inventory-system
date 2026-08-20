import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { UnitOfWork, Repository, Criteria, EstadoCodigo } from '@inventory-system/backend-domain';
import { Agrupador, Articulo, AsignacionArticulo, AsignacionAgrupador } from '@prisma/client';

@Injectable()
export class AgrupadoresService {
  constructor(
    @Inject('UnitOfWork') private readonly uow: UnitOfWork,
    @Inject('AgrupadorRepository') private readonly agrupadorRepo: Repository<Agrupador>,
    @Inject('ArticuloRepository') private readonly articuloRepo: Repository<Articulo>,
    @Inject('AsignacionRepository') private readonly asignacionRepo: Repository<AsignacionArticulo>,
    @Inject('AsignacionAgrupadorRepository') private readonly asignacionAgrupadorRepo: Repository<AsignacionAgrupador>,
  ) {}

  async create(data: any) {
    const entity = {
      nombre: data.nombre,
      tipoAgrupadorId: data.tipoAgrupadorId,
      agrupadorPadreId: data.agrupadorPadreId || null,
    };
    try {
      await this.agrupadorRepo.save(entity as any);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya existe un agrupador con ese nombre para este tipo de agrupador.');
      }
      throw e;
    }
  }

  async findAll(dominioId?: number, tipoAgrupadorId?: number) {
    const criteria = new Criteria();
    if (tipoAgrupadorId) {
      criteria.filters.push({ field: 'tipoAgrupadorId', operator: 'eq', value: Number(tipoAgrupadorId) });
    } else if (dominioId) {
      criteria.filters.push({ field: 'dominioId', operator: 'eq', value: Number(dominioId) });
    }
    return this.agrupadorRepo.search(criteria);
  }

  async findOne(id: number) {
    return this.agrupadorRepo.findById(id);
  }

  private async cascadeAgrupadorEstado(agrupadorId: number, estadoAgrupador: 'ASIGNADO' | 'DISPONIBLE', estadoArticuloCodigo: string) {
    const agrupador: any = await this.agrupadorRepo.findById(agrupadorId);
    if (!agrupador) return;

    if (agrupador.articulos && agrupador.articulos.length > 0) {
      for (const art of agrupador.articulos) {
        if (estadoAgrupador === 'DISPONIBLE') {
          if (art.estado?.codigo === EstadoCodigo.EN_USO) {
            await this.articuloRepo.save({ id: art.id, estadoCodigo: estadoArticuloCodigo } as any);
          }
        } else {
          await this.articuloRepo.save({ id: art.id, estadoCodigo: estadoArticuloCodigo } as any);
        }
      }
    }

    if (agrupador.subAgrupadores && agrupador.subAgrupadores.length > 0) {
      for (const sub of agrupador.subAgrupadores) {
        sub.estado = estadoAgrupador;
        await this.agrupadorRepo.save(sub);
        await this.cascadeAgrupadorEstado(sub.id, estadoAgrupador, estadoArticuloCodigo);
      }
    }
  }

  private async cascadeAgrupadorAsignacion(
    agrupadorId: number,
    empleadoId: number,
    isDevolucion: boolean
  ) {
    const agrupador: any = await this.agrupadorRepo.findById(agrupadorId);
    if (!agrupador) return;

    if (agrupador.articulos && agrupador.articulos.length > 0) {
      for (const art of agrupador.articulos) {
        if (isDevolucion) {
          const criteria = new Criteria();
          criteria.filters.push({ field: 'articuloId', operator: 'eq', value: art.id });
          const allAsgs = await this.asignacionRepo.search(criteria);
          const activeAsgs = allAsgs.filter((a) => !a.fechaDevolucion);
          for (const asg of activeAsgs) {
            asg.fechaDevolucion = new Date();
            await this.asignacionRepo.save(asg);
          }
        } else {
          await this.asignacionRepo.save({
            articuloId: art.id,
            empleadoId,
            fechaEntrega: new Date(),
            observaciones: null,
          } as any);
        }
      }
    }

    if (agrupador.subAgrupadores && agrupador.subAgrupadores.length > 0) {
      for (const sub of agrupador.subAgrupadores) {
        if (isDevolucion) {
          const criteria = new Criteria();
          criteria.filters.push({ field: 'agrupadorId', operator: 'eq', value: sub.id });
          const allAsgs = await this.asignacionAgrupadorRepo.search(criteria);
          const activeAsgs = allAsgs.filter((a) => !a.fechaDevolucion);
          for (const asg of activeAsgs) {
            asg.fechaDevolucion = new Date();
            await this.asignacionAgrupadorRepo.save(asg);
          }
        } else {
          await this.asignacionAgrupadorRepo.save({
            agrupadorId: sub.id,
            empleadoId,
            fechaEntrega: new Date(),
            observaciones: null,
          } as any);
        }
        await this.cascadeAgrupadorAsignacion(sub.id, empleadoId, isDevolucion);
      }
    }
  }

  async addArticulo(agrupadorId: number, articuloId: number) {
    return this.uow.execute(async () => {
      const parent: any = await this.agrupadorRepo.findById(agrupadorId);
      if (!parent) throw new BadRequestException('Agrupador no encontrado');

      const articulo: any = await this.articuloRepo.findById(articuloId);
      if (!articulo) throw new BadRequestException('Artículo no encontrado');
      if (articulo.estado?.codigo === EstadoCodigo.EN_USO) {
        throw new BadRequestException('Artículo asignado a empleado. No puede ser agregado.');
      }

      articulo.agrupadorId = agrupadorId;
      if (parent.estado === 'ASIGNADO') {
        articulo.estadoCodigo = EstadoCodigo.EN_USO;
        await this.articuloRepo.save(articulo);

        // Buscar TODAS las asignaciones activas del agrupador padre
        const criteria = new Criteria();
        criteria.filters.push({ field: 'agrupadorId', operator: 'eq', value: agrupadorId });
        const parentAsgs = await this.asignacionAgrupadorRepo.search(criteria);
        const activeParentAsgs = parentAsgs.filter((a) => !a.fechaDevolucion);
        for (const activeParentAsg of activeParentAsgs) {
          await this.asignacionRepo.save({
            articuloId: articulo.id,
            empleadoId: activeParentAsg.empleadoId,
            fechaEntrega: new Date(),
            observaciones: null,
          } as any);
        }
      } else {
        await this.articuloRepo.save(articulo);
      }
      return { success: true };
    });
  }

  async removeArticulo(articuloId: number, nuevoEstadoCodigo?: string) {
    return this.uow.execute(async () => {
      const articulo: any = await this.articuloRepo.findById(articuloId);
      if (!articulo) throw new BadRequestException('Artículo no encontrado');

      articulo.agrupadorId = null;
      if (nuevoEstadoCodigo) {
        articulo.estadoCodigo = nuevoEstadoCodigo;
      } else {
        articulo.estadoCodigo = EstadoCodigo.DISPONIBLE;
      }
      await this.articuloRepo.save(articulo);

      // Cerrar asignación activa de este artículo
      const criteria = new Criteria();
      criteria.filters.push({ field: 'articuloId', operator: 'eq', value: articuloId });
      const allAsgs = await this.asignacionRepo.search(criteria);
      const activeAsgs = allAsgs.filter((a) => !a.fechaDevolucion);
      for (const asg of activeAsgs) {
        asg.fechaDevolucion = new Date();
        await this.asignacionRepo.save(asg);
      }

      return { success: true };
    });
  }

  async addSubAgrupador(parentAgrupadorId: number, childAgrupadorId: number) {
    return this.uow.execute(async () => {
      const parent: any = await this.agrupadorRepo.findById(parentAgrupadorId);
      const child: any = await this.agrupadorRepo.findById(childAgrupadorId);

      if (!parent || !child) throw new BadRequestException('Agrupador no encontrado');
      if (parentAgrupadorId === childAgrupadorId) {
        throw new BadRequestException('Un agrupador no puede ser sub-agrupador de sí mismo');
      }

      // Evitar ciclos: recorrer hacia arriba la cadena de padres.
      let currentParent: any = parent;
      while (currentParent.agrupadorPadreId) {
        if (currentParent.agrupadorPadreId === childAgrupadorId) {
          throw new BadRequestException('Dependencia circular detectada');
        }
        const nextParent = await this.agrupadorRepo.findById(currentParent.agrupadorPadreId);
        if (!nextParent) break;
        currentParent = nextParent;
      }

      child.agrupadorPadreId = parentAgrupadorId;
      if (parent.estado === 'ASIGNADO') {
        child.estado = 'ASIGNADO';
        await this.agrupadorRepo.save(child);
        await this.cascadeAgrupadorEstado(child.id, 'ASIGNADO', EstadoCodigo.EN_USO);

        // Buscar TODAS las asignaciones activas del agrupador padre
        const criteria = new Criteria();
        criteria.filters.push({ field: 'agrupadorId', operator: 'eq', value: parentAgrupadorId });
        const parentAsgs = await this.asignacionAgrupadorRepo.search(criteria);
        const activeParentAsgs = parentAsgs.filter((a) => !a.fechaDevolucion);
        for (const activeParentAsg of activeParentAsgs) {
          await this.asignacionAgrupadorRepo.save({
            agrupadorId: child.id,
            empleadoId: activeParentAsg.empleadoId,
            fechaEntrega: new Date(),
            observaciones: null,
          } as any);
          await this.cascadeAgrupadorAsignacion(child.id, activeParentAsg.empleadoId, false);
        }
      } else {
        await this.agrupadorRepo.save(child);
      }
      return { success: true };
    });
  }

  async removeSubAgrupador(childAgrupadorId: number) {
    return this.uow.execute(async () => {
      const child: any = await this.agrupadorRepo.findById(childAgrupadorId);
      if (!child) throw new BadRequestException('Agrupador no encontrado');

      const parentId = child.agrupadorPadreId;
      child.agrupadorPadreId = null;

      if (parentId) {
        const parent: any = await this.agrupadorRepo.findById(parentId);
        if (parent && parent.estado === 'ASIGNADO') {
          child.estado = 'DISPONIBLE';
          await this.agrupadorRepo.save(child);
          await this.cascadeAgrupadorEstado(child.id, 'DISPONIBLE', EstadoCodigo.DISPONIBLE);

          // Cerrar asignación del sub-agrupador
          const criteria = new Criteria();
          criteria.filters.push({ field: 'agrupadorId', operator: 'eq', value: child.id });
          const allAsgs = await this.asignacionAgrupadorRepo.search(criteria);
          const activeAsgs = allAsgs.filter((a) => !a.fechaDevolucion);
          for (const asg of activeAsgs) {
            asg.fechaDevolucion = new Date();
            await this.asignacionAgrupadorRepo.save(asg);
          }

          // Cerrar recursivamente todas las asignaciones internas
          await this.cascadeAgrupadorAsignacion(child.id, 0, true);
        } else {
          await this.agrupadorRepo.save(child);
        }
      } else {
        await this.agrupadorRepo.save(child);
      }
      return { success: true };
    });
  }
}
