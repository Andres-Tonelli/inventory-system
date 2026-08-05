import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Repository, Criteria, StockLoteRepository, EstadoArticuloRepository } from '@inventory-system/backend-domain';
import { Articulo, StockLote } from '@prisma/client';

@Injectable()
export class InventarioService {
  constructor(
    @Inject('ArticuloRepository') private readonly articuloRepo: Repository<Articulo>,
    @Inject('StockLoteRepository') private readonly loteRepo: StockLoteRepository,
    @Inject('EstadoArticuloRepository') private readonly estadoRepo: EstadoArticuloRepository
  ) {}

  async createArticulo(data: any) {
    // data.atributosDinamicos llega desde el front (e.g. { nSerie: "123", talle: "XL" })
    await this.articuloRepo.save(data as Articulo);
  }

  /** Edita los datos de un artículo (alias, nº serie, modelo, detalle, atributos). No toca el estado. */
  async actualizarArticulo(id: number, data: { nroSerie?: string | null; alias?: string | null; detalle?: string | null; modeloId?: number; atributos?: Record<string, unknown> }) {
    const articulo = await this.articuloRepo.findById(id);
    if (!articulo) {
      throw new BadRequestException('Artículo no encontrado');
    }
    try {
      await this.articuloRepo.save({ id, ...data } as any);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya existe otro artículo con ese nº de serie');
      }
      throw e;
    }
  }

  /** Cambio manual del estado de un artículo (marcar en reparación, baja, disponible, etc.). */
  async cambiarEstadoArticulo(id: number, estadoCodigo: string) {
    const articulo = await this.articuloRepo.findById(id);
    if (!articulo) {
      throw new BadRequestException('Artículo no encontrado');
    }
    const dominioId = (articulo as any).modelo?.categoria?.dominioId;
    if (!dominioId) {
      throw new BadRequestException('No se pudo determinar el dominio del artículo');
    }
    const estados = await this.estadoRepo.listar(dominioId);
    if (!estados.some((e) => e.codigo === estadoCodigo)) {
      throw new BadRequestException(`Estado inválido: ${estadoCodigo}`);
    }
    // El repo resuelve estadoCodigo -> estadoId (ver ADR-0004 D4).
    await this.articuloRepo.save({ id, estadoCodigo } as any);
  }

  async getArticulos(searchParams?: { modeloId?: number, estado?: string, dominioId?: number, categoriaId?: number }) {
    const criteria = new Criteria();
    if (searchParams?.modeloId) criteria.filters.push({ field: 'modeloId', operator: 'eq', value: Number(searchParams.modeloId) });
    if (searchParams?.categoriaId) criteria.filters.push({ field: 'categoriaId', operator: 'eq', value: Number(searchParams.categoriaId) });
    if (searchParams?.estado) criteria.filters.push({ field: 'estado', operator: 'eq', value: searchParams.estado });
    if (searchParams?.dominioId) criteria.filters.push({ field: 'dominioId', operator: 'eq', value: Number(searchParams.dominioId) });
    return this.articuloRepo.search(criteria);
  }

  // --- LOTES ---
  async createLote(data: any) {
    // cantidadInicial deja registrado lo que ingresó (trazabilidad del lote).
    await this.loteRepo.save({
      ...data,
      cantidadInicial: data.cantidadInicial ?? data.cantidadDisponible ?? 0,
    } as StockLote);
  }

  async getLotes(searchParams?: { modeloId?: number, dominioId?: number }) {
    const criteria = new Criteria();
    if (searchParams?.modeloId) criteria.filters.push({ field: 'modeloId', operator: 'eq', value: Number(searchParams.modeloId) });
    if (searchParams?.dominioId) criteria.filters.push({ field: 'dominioId', operator: 'eq', value: Number(searchParams.dominioId) });
    return this.loteRepo.search(criteria);
  }

  async consumirLote(loteId: number, cantidad: number) {
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad a consumir debe ser mayor a cero');
    }
    // Descuento ATÓMICO (evita lost-update). Ver ADR-0004 / REVISION A2.
    const ok = await this.loteRepo.descontarStock(loteId, cantidad);
    if (!ok) {
      const lote = await this.loteRepo.findById(loteId);
      if (!lote) throw new BadRequestException('Lote no encontrado');
      throw new BadRequestException('Cantidad a consumir supera el stock disponible');
    }
  }

  async adicionarStock(loteId: number, cantidad: number) {
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad a adicionar debe ser mayor a cero');
    }
    const lote = await this.loteRepo.findById(loteId);
    if (!lote) {
      throw new BadRequestException('Lote no encontrado');
    }
    await this.loteRepo.agregarStock(loteId, cantidad);
  }
}
