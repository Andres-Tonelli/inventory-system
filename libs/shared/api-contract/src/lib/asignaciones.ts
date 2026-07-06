/**
 * Contrato del contexto Asignaciones: entregas de artículos, agrupadores y
 * consumibles a empleados.
 */
import type { Articulo } from './inventario';
import type { Agrupador } from './agrupadores';
import type { Empleado } from './empleados';

export interface AsignacionArticulo {
  id?: number;
  articuloId: number;
  empleadoId: number;
  fechaEntrega: string;
  fechaDevolucion?: string | null;
  observaciones?: string | null;
  articulo?: Articulo;
  empleado?: Empleado;
}

/** Alias histórico usado por el front. */
export type Asignacion = AsignacionArticulo;

export interface AsignacionAgrupador {
  id?: number;
  agrupadorId: number;
  empleadoId: number;
  fechaEntrega: string;
  fechaDevolucion?: string | null;
  observaciones?: string | null;
  agrupador?: Agrupador;
  empleado?: Empleado;
}

export interface EntregaConsumible {
  id?: number;
  loteId: number;
  empleadoId: number;
  cantidadEntregada: number;
  fechaEntrega: string;
  empleado?: Empleado;
  lote?: any;
}

// --- Write DTOs ---

export interface AsignarArticuloDto {
  articuloId: number;
  empleadoId: number;
  observaciones?: string;
}

export interface AsignarAgrupadorDto {
  agrupadorId: number;
  empleadoId: number;
  observaciones?: string;
}

export interface AsignarConsumibleDto {
  loteId: number;
  empleadoId: number;
  cantidad: number;
}
