/**
 * Códigos estables de EstadoArticulo. El código de negocio referencia estados
 * SIEMPRE por estos códigos, nunca por id numérico (ver ADR-0004 D4).
 */
export const EstadoCodigo = {
  DISPONIBLE: 'DISPONIBLE',
  EN_USO: 'EN_USO',
  EN_REPARACION: 'EN_REPARACION',
  BAJA: 'BAJA',
} as const;

export type EstadoCodigo = (typeof EstadoCodigo)[keyof typeof EstadoCodigo];
