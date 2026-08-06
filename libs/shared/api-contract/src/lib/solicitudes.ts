/**
 * Contrato del contexto Solicitudes: pedidos de insumos, reporte de roturas
 * e incidentes y préstamos temporales de artículos.
 */
export interface Solicitud {
  id?: number;
  tipo: 'ROTURA' | 'ESCASEZ' | 'TEMPORAL' | 'GENERAL';
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ENTREGADA';
  empleadoId: number;
  dominioId?: number | null;
  articuloId?: number | null;
  categoriaId?: number | null;
  modeloId?: number | null;
  cantidad: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  titulo?: string | null;
  motivo: string;
  observacionesAdmin?: string | null;
  createdAt?: string;
  updatedAt?: string;
  empleado?: any;
  dominio?: any;
  articulo?: any;
  categoria?: any;
  modelo?: any;
}

// --- Write DTOs ---

export interface CreateSolicitudDto {
  tipo: 'ROTURA' | 'ESCASEZ' | 'TEMPORAL' | 'GENERAL';
  dominioId?: number;
  articuloId?: number;
  categoriaId?: number;
  modeloId?: number;
  cantidad?: number;
  fechaInicio?: string;
  fechaFin?: string;
  titulo?: string;
  motivo: string;
}

export interface ResolverSolicitudDto {
  estado: 'APROBADA' | 'RECHAZADA' | 'ENTREGADA';
  observacionesAdmin?: string;
  nuevoEstadoArticuloCodigo?: string;
}
