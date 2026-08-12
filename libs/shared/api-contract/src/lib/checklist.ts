/**
 * Contrato del contexto Checklists: plantillas de checklist y aspectos
 * asociados por dominio.
 */

export interface AspectoChecklist {
  id?: number;
  nombre: string;
  dominioId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChecklistItem {
  id?: number;
  checklistId?: number;
  pregunta: string;
  orden: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Checklist {
  id?: number;
  titulo: string;
  aspectoId: number;
  aspecto?: AspectoChecklist;
  ambito: 'ARTICULO' | 'AGRUPADOR';
  categoriaId?: number | null;
  categoria?: any;
  tipoAgrupadorId?: number | null;
  tipoAgrupador?: any;
  items: ChecklistItem[];
  createdAt?: string;
  updatedAt?: string;
}

// --- Write DTOs ---

export interface CreateAspectoDto {
  nombre: string;
}

export interface CreateChecklistDto {
  dominioId: number;
  titulo: string;
  aspectoId: number;
  ambito: 'ARTICULO' | 'AGRUPADOR';
  categoriaId?: number | null;
  tipoAgrupadorId?: number | null;
  items: { pregunta: string; orden: number }[];
}

export interface ChecklistValor {
  id?: number;
  instanciaId?: number;
  checklistItemId: number;
  checklistItem?: ChecklistItem;
  valor: boolean;
  observacion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChecklistInstancia {
  id?: number;
  checklistId: number;
  checklist?: Checklist;
  articuloId?: number | null;
  articulo?: any;
  agrupadorId?: number | null;
  agrupador?: any;
  observaciones?: string | null;
  responsable?: string | null;
  valores: ChecklistValor[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateChecklistValorDto {
  checklistItemId: number;
  valor: boolean;
  observacion?: string | null;
}

export interface CreateChecklistInstanciaDto {
  checklistId: number;
  articuloId?: number | null;
  agrupadorId?: number | null;
  observaciones?: string | null;
  responsable?: string | null;
  valores: CreateChecklistValorDto[];
}
