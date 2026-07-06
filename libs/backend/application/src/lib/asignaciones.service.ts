import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  UnitOfWork,
  Repository,
  Criteria,
  EstadoCodigo,
  StockLoteRepository,
  EntregaConsumibleRepository,
} from '@inventory-system/backend-domain';
import { AsignacionArticulo, AsignacionAgrupador, Articulo, Agrupador } from '@prisma/client';

@Injectable()
export class AsignacionesService {
  constructor(
    @Inject('UnitOfWork') private readonly uow: UnitOfWork,
    @Inject('ArticuloRepository') private readonly articuloRepo: Repository<Articulo>,
    @Inject('AsignacionRepository') private readonly asignacionRepo: Repository<AsignacionArticulo>,
    @Inject('AsignacionAgrupadorRepository')
    private readonly asignacionAgrupadorRepo: Repository<AsignacionAgrupador>,
    @Inject('AgrupadorRepository') private readonly agrupadorRepo: Repository<Agrupador>,
    @Inject('StockLoteRepository') private readonly stockLoteRepo: StockLoteRepository,
    @Inject('EntregaConsumibleRepository')
    private readonly entregaConsumibleRepo: EntregaConsumibleRepository,
  ) {}

  async asignarArticulo(articuloId: number, empleadoId: number, observaciones?: string) {
    return this.uow.execute(async () => {
      const articulo: any = await this.articuloRepo.findById(articuloId);
      if (!articulo) {
        throw new BadRequestException('Artículo no encontrado');
      }
      if (articulo.estado?.codigo === EstadoCodigo.EN_USO) {
        throw new BadRequestException('El artículo ya se encuentra asignado a otra persona');
      }
      // Contención ≠ asignación: si está dentro de un agrupador, se asigna el agrupador.
      if (articulo.agrupadorId != null) {
        throw new BadRequestException('El artículo es parte de un Agrupador. Asigne el Agrupador completo.');
      }

      articulo.estadoCodigo = EstadoCodigo.EN_USO;
      await this.articuloRepo.save(articulo);

      await this.asignacionRepo.save({
        articuloId: articulo.id,
        empleadoId,
        fechaEntrega: new Date(),
        observaciones: observaciones || null,
      } as any);

      return { success: true };
    });
  }

  async asignarAgrupador(agrupadorId: number, empleadoId: number, observaciones?: string) {
    return this.uow.execute(async () => {
      const agrupador: any = await this.agrupadorRepo.findById(agrupadorId);
      if (!agrupador) throw new BadRequestException('Agrupador no encontrado');

      // Sólo se pueden asignar tipos marcados como asignables (ver ADR-0004 D3).
      if (!agrupador.tipoAgrupador?.asignable) {
        throw new BadRequestException('Este tipo de agrupador no es asignable (es un contenedor/ubicación)');
      }
      if (agrupador.estado === 'ASIGNADO') throw new BadRequestException('Agrupador ya asignado');

      // Único escritor de `estado` (denormalizado), en la misma transacción. Ver ADR-0004 D5.
      agrupador.estado = 'ASIGNADO';
      await this.agrupadorRepo.save(agrupador);

      // Los artículos DIRECTOS pasan a "en uso". No se cascada a sub-agrupadores (ADR-0004 D2).
      if (agrupador.articulos && agrupador.articulos.length > 0) {
        for (const art of agrupador.articulos) {
          art.estadoCodigo = EstadoCodigo.EN_USO;
          await this.articuloRepo.save(art);
        }
      }

      await this.asignacionAgrupadorRepo.save({
        agrupadorId,
        empleadoId,
        observaciones: observaciones || null,
        fechaEntrega: new Date(),
      } as any);

      return { success: true };
    });
  }

  async getAsignaciones(dominioId?: number) {
    const criteriaArticulos = new Criteria();
    const criteriaAgrupadores = new Criteria();
    if (dominioId) {
      criteriaArticulos.filters.push({ field: 'dominioId', operator: 'eq', value: Number(dominioId) });
      criteriaAgrupadores.filters.push({ field: 'dominioId', operator: 'eq', value: Number(dominioId) });
    }

    const asigArticulos = await this.asignacionRepo.search(criteriaArticulos);
    const asigAgrupadores = await this.asignacionAgrupadorRepo.search(criteriaAgrupadores);

    const criteriaEntregas = new Criteria();
    if (dominioId) {
      criteriaEntregas.filters.push({ field: 'dominioId', operator: 'eq', value: Number(dominioId) });
    }
    const entregas = await this.entregaConsumibleRepo.search(criteriaEntregas);

    return [...asigArticulos, ...asigAgrupadores, ...entregas];
  }

  /** Todo lo que "tiene" un empleado hoy: conjuntos asignados (con sus artículos) + artículos sueltos asignados. */
  async getAsignacionesDeEmpleado(empleadoId: number) {
    const activa = (extra: any[] = []) =>
      new Criteria([
        { field: 'empleadoId', operator: 'eq', value: empleadoId },
        { field: 'fechaDevolucion', operator: 'eq', value: null },
        ...extra,
      ]);

    const asigAgr = await this.asignacionAgrupadorRepo.search(activa());
    const agrupadores: any[] = [];
    for (const asg of asigAgr as any[]) {
      const full = await this.agrupadorRepo.findById(asg.agrupadorId);
      agrupadores.push({ ...(full as any), fechaEntrega: asg.fechaEntrega, observaciones: asg.observaciones });
    }

    const asigArt = await this.asignacionRepo.search(activa());
    const articulos = (asigArt as any[]).map((asg) => ({
      ...(asg.articulo ?? {}),
      fechaEntrega: asg.fechaEntrega,
      observaciones: asg.observaciones,
    }));

    return { agrupadores, articulos };
  }

  async asignarConsumible(loteId: number, empleadoId: number, cantidad: number) {
    if (!loteId || !empleadoId || cantidad <= 0) {
      throw new BadRequestException('Parámetros de asignación inválidos');
    }

    return this.uow.execute(async () => {
      // Descuento atómico + creación de la entrega, en la misma transacción.
      const ok = await this.stockLoteRepo.descontarStock(loteId, cantidad);
      if (!ok) {
        const lote = await this.stockLoteRepo.findById(loteId);
        if (!lote) throw new BadRequestException('Lote no encontrado');
        throw new BadRequestException(`No hay suficiente stock en el lote. Disponible: ${lote.cantidadDisponible}`);
      }

      const entrega = await this.entregaConsumibleRepo.crear({
        loteId,
        empleadoId,
        cantidadEntregada: cantidad,
      });

      return { success: true, data: entrega };
    });
  }
}
