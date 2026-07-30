/**
 * Contrato del contexto Inventario: artículos (con atributos dinámicos en JSONB) y lotes de stock.
 */
import type { Modelo } from './catalogos';
import type { Agrupador } from './agrupadores';
import type { AsignacionArticulo } from './asignaciones';

export interface Articulo {
  id?: number;
  nroSerie?: string | null;
  alias?: string | null;
  /** Nota/descripción libre, general para cualquier artículo (no es atributo de dominio). */
  detalle?: string | null;
  estadoId?: number;
  /**
   * Laxo a propósito: la UI lo trata como objeto (`estado.nombre`) y como string
   * indistintamente. Ver ADR-0002 §"Deuda".
   */
  estado?: any;
  modeloId: number;
  modelo?: Modelo;
  agrupadorId?: number | null;
  agrupador?: Agrupador;
  /** Valores de atributos dinámicos, por clave: { "ram": "16" } (JSONB). Ver ADR-0004 D1. */
  atributos?: Record<string, unknown>;
  asignaciones?: AsignacionArticulo[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StockLote {
  id?: number;
  modeloId: number;
  cantidadInicial?: number;
  cantidadDisponible: number;
  referencia?: string | null;
  fechaIngreso?: string;
  atributos?: any;
  modelo?: Modelo;
  createdAt?: string;
  updatedAt?: string;
}

// --- Write DTOs ---

export interface CreateArticuloDto {
  nroSerie?: string | null;
  alias?: string | null;
  detalle?: string | null;
  modeloId: number;
  /** Código estable del estado inicial (ej. 'DISPONIBLE'). El back lo resuelve a estadoId. */
  estadoCodigo?: string;
  atributos?: Record<string, unknown>;
}

/** Edición de los datos de un artículo (corregir carga). El estado se cambia por su endpoint aparte. */
export interface UpdateArticuloDto {
  nroSerie?: string | null;
  alias?: string | null;
  detalle?: string | null;
  modeloId?: number;
  atributos?: Record<string, unknown>;
}

/** Cambio manual del estado de un artículo (ej. marcar EN_REPARACION / BAJA / volver a DISPONIBLE). */
export interface UpdateEstadoArticuloDto {
  /** Código estable del nuevo estado (ej. 'EN_REPARACION'). El back lo resuelve a estadoId. */
  estadoCodigo: string;
}

export interface CreateLoteDto {
  cantidadDisponible: number;
  modeloId: number;
  referencia?: string;
  atributos?: any;
}

/** Ajuste de stock de un lote (consumir / adicionar). */
export interface AjusteStockDto {
  cantidad: number;
}
