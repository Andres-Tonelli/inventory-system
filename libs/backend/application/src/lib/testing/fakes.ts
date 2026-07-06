import { Criteria } from '@inventory-system/backend-domain';

/**
 * Dobles de test in-memory para los puertos del dominio.
 *
 * Este archivo es la prueba viviente de la indirección de persistencia (ADR-0001/0005):
 * los services de aplicación se testean SIN Prisma ni base de datos, instanciándolos
 * directo con estos fakes que implementan los mismos puertos.
 */

/** UnitOfWork de test: ejecuta el trabajo directamente (sin transacción real). */
export function fakeUow() {
  return { execute: <T>(work: () => Promise<T>) => work() };
}

/**
 * Repositorio genérico en memoria. Cumple `Repository<T>`:
 * - `save` hace upsert por id (merge, como el update de Prisma) y registra cada
 *   llamada en `savedWith` para poder assertear QUÉ escribió el service.
 * - `search` aplica los filtros `eq` del Criteria sobre campos planos.
 */
export class InMemoryRepo<T extends { id?: number }> {
  private seq = 1;
  readonly items = new Map<number, any>();
  readonly savedWith: any[] = [];

  seed(...entities: any[]): this {
    for (const e of entities) {
      const id = e.id ?? this.seq++;
      this.items.set(id, { ...e, id });
      this.seq = Math.max(this.seq, id + 1);
    }
    return this;
  }

  async save(entity: any): Promise<void> {
    this.savedWith.push({ ...entity });
    if (entity.id && this.items.has(entity.id)) {
      this.items.set(entity.id, { ...this.items.get(entity.id), ...entity });
    } else {
      const id = entity.id ?? this.seq++;
      this.items.set(id, { ...entity, id });
      this.seq = Math.max(this.seq, id + 1);
    }
  }

  async findById(id: number): Promise<T | null> {
    return this.items.get(id) ?? null;
  }

  async search(criteria: Criteria): Promise<T[]> {
    let list = [...this.items.values()];
    for (const f of criteria.filters) {
      if (f.operator === 'eq') {
        list = list.filter((i) => (i[f.field] ?? null) === f.value);
      }
    }
    return list;
  }

  async delete(id: number): Promise<void> {
    if (!this.items.delete(id)) {
      throw new Error(`delete: id ${id} no existe (simula error de FK/registro inexistente)`);
    }
  }
}

/** StockLoteRepository fake con la semántica atómica de descontar (condición + decremento). */
export class InMemoryLoteRepo extends InMemoryRepo<any> {
  async descontarStock(loteId: number, cantidad: number): Promise<boolean> {
    const lote = this.items.get(loteId);
    if (!lote || lote.cantidadDisponible < cantidad) return false;
    lote.cantidadDisponible -= cantidad;
    return true;
  }
  async agregarStock(loteId: number, cantidad: number): Promise<void> {
    const lote = this.items.get(loteId);
    if (lote) lote.cantidadDisponible += cantidad;
  }
}

/** EstadoArticuloRepository fake con el set de estados de referencia del sistema. */
export class InMemoryEstadoRepo {
  estados = [
    { id: 1, codigo: 'DISPONIBLE', nombre: 'Disponible' },
    { id: 2, codigo: 'EN_USO', nombre: 'En uso' },
    { id: 3, codigo: 'EN_REPARACION', nombre: 'Para reparación' },
    { id: 4, codigo: 'BAJA', nombre: 'Fuera de uso/Roto' },
  ];
  readonly creados: Array<{ nombre: string; codigo: string }> = [];

  async crear(nombre: string, codigo: string): Promise<void> {
    this.creados.push({ nombre, codigo });
  }
  async listar() {
    return this.estados;
  }
  async actualizar(): Promise<void> {
    /* no-op */
  }
  async eliminar(): Promise<void> {
    /* no-op */
  }
}

/** EntregaConsumibleRepository fake. */
export class InMemoryEntregaRepo {
  private seq = 1;
  readonly entregas: any[] = [];

  async crear(data: any) {
    const entrega = { ...data, id: this.seq++, fechaEntrega: new Date() };
    this.entregas.push(entrega);
    return entrega;
  }
  async search() {
    return this.entregas;
  }
}
