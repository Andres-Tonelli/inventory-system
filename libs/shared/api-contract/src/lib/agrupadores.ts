/**
 * Contrato del contexto Agrupadores (conjuntos jerárquicos de artículos).
 *
 * NOTA: `articulos`, `subAgrupadores`, `asignaciones` y `tipoAgrupador` quedan
 * como `any[]`/`any` a propósito en este primer corte: la API hoy devuelve estas
 * relaciones anidadas con forma variable. Tiparlas fuerte es trabajo futuro
 * (requiere que el back devuelva view-models estables). Ver ADR-0002 §"Deuda".
 */
import type { EstadoAgrupador } from './common';

export interface Agrupador {
  id?: number;
  nombre: string;
  estado?: EstadoAgrupador;
  dominioId?: number;
  tipoAgrupadorId?: number;
  agrupadorPadreId?: number;
  articulos?: any[];
  subAgrupadores?: any[];
  tipoAgrupador?: any;
  asignaciones?: any[];
}

// --- Write DTOs ---

export interface CreateAgrupadorDto {
  nombre: string;
  tipoAgrupadorId: number;
  agrupadorPadreId?: number;
}

export interface AddArticuloAgrupadorDto {
  articuloId: number;
}

export interface AddSubAgrupadorDto {
  childAgrupadorId: number;
}
