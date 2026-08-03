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

      // Cascada recursiva a todos los sub-agrupadores y artículos contenidos
      await this.cascadeAgrupadorEstado(agrupadorId, 'ASIGNADO', EstadoCodigo.EN_USO);

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

  /**
   * Lo que "tiene" un empleado hoy (agrupadores con sus artículos + artículos sueltos)
   * y su HISTORIAL: todo lo que tuvo y ya devolvió, ordenado por devolución reciente.
   */
  async getAsignacionesDeEmpleado(empleadoId: number) {
    const porEmpleado = new Criteria([{ field: 'empleadoId', operator: 'eq', value: empleadoId }]);
    const asigAgr = (await this.asignacionAgrupadorRepo.search(porEmpleado)) as any[];
    const asigArt = (await this.asignacionRepo.search(porEmpleado)) as any[];

    const agrupadores: any[] = [];
    for (const asg of asigAgr.filter((a) => !a.fechaDevolucion)) {
      const full = await this.agrupadorRepo.findById(asg.agrupadorId);
      agrupadores.push({ ...(full as any), fechaEntrega: asg.fechaEntrega, observaciones: asg.observaciones });
    }

    const articulos = asigArt
      .filter((a) => !a.fechaDevolucion)
      .map((asg) => ({
        ...(asg.articulo ?? {}),
        fechaEntrega: asg.fechaEntrega,
        observaciones: asg.observaciones,
      }));

    const historial = [
      ...asigAgr
        .filter((a) => a.fechaDevolucion)
        .map((a) => ({
          tipo: 'AGRUPADOR',
          nombre: a.agrupador?.nombre ?? `Agrupador #${a.agrupadorId}`,
          detalle: a.agrupador?.tipoAgrupador?.nombre ?? null,
          fechaEntrega: a.fechaEntrega,
          fechaDevolucion: a.fechaDevolucion,
          observaciones: a.observaciones,
        })),
      ...asigArt
        .filter((a) => a.fechaDevolucion)
        .map((a) => ({
          tipo: 'ARTICULO',
          nombre: a.articulo?.alias ?? a.articulo?.nroSerie ?? `Artículo #${a.articuloId}`,
          detalle: a.articulo?.modelo?.nombre ?? null,
          fechaEntrega: a.fechaEntrega,
          fechaDevolucion: a.fechaDevolucion,
          observaciones: a.observaciones,
        })),
    ].sort((x, y) => new Date(y.fechaDevolucion).getTime() - new Date(x.fechaDevolucion).getTime());

    return { agrupadores, articulos, historial };
  }

  /** Devolución de un artículo: estampa fechaDevolucion y el artículo vuelve a DISPONIBLE. */
  async devolverArticulo(asignacionId: number) {
    return this.uow.execute(async () => {
      const asig: any = await this.asignacionRepo.findById(asignacionId);
      if (!asig) throw new BadRequestException('Asignación no encontrada');
      if (asig.fechaDevolucion) throw new BadRequestException('La asignación ya fue devuelta');

      await this.asignacionRepo.save({ id: asig.id, fechaDevolucion: new Date() } as any);
      await this.articuloRepo.save({ id: asig.articuloId, estadoCodigo: EstadoCodigo.DISPONIBLE } as any);
      return { success: true };
    });
  }

  /**
   * Devolución de un agrupador (imagen espejo de asignarAgrupador, ver ADR-0004 D2/D5):
   * estampa la fecha, el agrupador vuelve a DISPONIBLE (único escritor del estado
   * denormalizado) y sus artículos DIRECTOS que estaban EN_USO vuelven a DISPONIBLE.
   * La condición (EN_REPARACION/BAJA) se respeta y no hay cascada a sub-agrupadores.
   */
  async devolverAgrupador(asignacionId: number) {
    return this.uow.execute(async () => {
      const asig: any = await this.asignacionAgrupadorRepo.findById(asignacionId);
      if (!asig) throw new BadRequestException('Asignación no encontrada');
      if (asig.fechaDevolucion) throw new BadRequestException('La asignación ya fue devuelta');

      await this.asignacionAgrupadorRepo.save({ id: asig.id, fechaDevolucion: new Date() } as any);

      const agrupador: any = await this.agrupadorRepo.findById(asig.agrupadorId);
      if (agrupador) {
        agrupador.estado = 'DISPONIBLE';
        await this.agrupadorRepo.save(agrupador);

        // Cascada recursiva a todos los sub-agrupadores y artículos contenidos
        await this.cascadeAgrupadorEstado(asig.agrupadorId, 'DISPONIBLE', EstadoCodigo.DISPONIBLE);
      }
      return { success: true };
    });
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
