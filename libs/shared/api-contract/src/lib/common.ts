/**
 * Envelope de las respuestas de la API REST y tipos transversales.
 * Ver docs/decisions/ADR-0002-contrato-rest-compartido.md
 */

/** Respuesta estándar con payload. `data` siempre presente en un 200 OK. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** Respuesta donde `data` puede faltar (ej. create que sólo confirma, login). */
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/** Respuesta sin payload: sólo confirma una operación. */
export interface ApiMessage {
  success: boolean;
  message: string;
}

// --- Enums de dominio (espejo de los enums de Prisma, sin acoplar el front a @prisma/client) ---

export const TIPO_SEGUIMIENTO = ['UNITARIO', 'POR_LOTE'] as const;
export type TipoSeguimiento = (typeof TIPO_SEGUIMIENTO)[number];

export const ESTADO_AGRUPADOR = ['DISPONIBLE', 'ASIGNADO'] as const;
export type EstadoAgrupador = (typeof ESTADO_AGRUPADOR)[number];
