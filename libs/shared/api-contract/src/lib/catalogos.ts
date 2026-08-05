/**
 * Contrato del contexto Catálogos: dominios, categorías, marcas, modelos,
 * atributos dinámicos, tipos de agrupador y estados de artículo.
 *
 * Los `*Dto` son el payload de escritura (request body). Las interfaces sin
 * sufijo son read-models: lo que la API devuelve.
 */
import type { TipoSeguimiento } from './common';

/**
 * Identidad visual configurable de un dominio (ver ADR-0008). Se guardan en la base;
 * el front las usa para pintar icono + acento de color en dashboard y config.
 * Se validan contra estas listas cerradas para no aceptar valores arbitrarios.
 */
export const DOMINIO_ICONOS = [
  'box', 'desktop', 'shield', 'pencil', 'car', 'truck',
  'wrench', 'home', 'briefcase', 'book', 'tag', 'cog',
] as const;
export type DominioIcono = (typeof DOMINIO_ICONOS)[number];

export const DOMINIO_COLORES = [
  'indigo', 'blue', 'green', 'amber', 'violet', 'teal', 'rose', 'slate',
] as const;
export type DominioColor = (typeof DOMINIO_COLORES)[number];

// --- Read-models ---

export interface Dominio {
  id?: number;
  nombre: string;
  /** Icono (sufijo de PrimeIcons, ej. 'desktop' → `pi pi-desktop`). Ver ADR-0008. */
  icono?: string;
  /** Token de color del acento (ej. 'blue'). Ver ADR-0008. */
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Categoria {
  id?: number;
  nombre: string;
  tipoSeguimiento?: TipoSeguimiento;
  dominioId: number;
  dominio?: Dominio;
  atributos?: AtributoDefinicion[];
}

export interface Marca {
  id?: number;
  nombre: string;
  dominioId: number;
  dominio?: Dominio;
}

export interface Modelo {
  id?: number;
  nombre: string;
  detalle?: string;
  marcaId: number;
  categoriaId: number;
  atributos?: any;
  marca?: Marca;
  categoria?: Categoria;
}

export interface AtributoDefinicion {
  id?: number;
  nombre: string;
  clave: string;
  tipoDato: string;
  categoriaId: number;
  nivel?: string;
}

export interface TipoAgrupador {
  id?: number;
  nombre: string;
  dominioId: number;
  /** true = conjunto asignable a persona; false = contenedor/ubicación (ej. locker). Ver ADR-0004 D3. */
  asignable?: boolean;
  categoriasRecomendadas?: { categoria: Categoria }[];
  subTiposRecomendados?: { childTipo: TipoAgrupador }[];
}

export interface EstadoArticulo {
  id?: number;
  nombre: string;
  /** Código estable (ej. DISPONIBLE); lo deriva el backend. Ver ADR-0004 D4. */
  codigo?: string;
}

// --- Write DTOs ---

export interface CreateDominioDto {
  nombre: string;
  icono?: DominioIcono;
  color?: DominioColor;
}

export interface CreateCategoriaDto {
  nombre: string;
  dominioId: number;
  tipoSeguimiento?: TipoSeguimiento;
}

export interface CreateMarcaDto {
  nombre: string;
  dominioId: number;
}

export interface CreateModeloDto {
  nombre: string;
  detalle?: string;
  marcaId: number;
  categoriaId: number;
  atributos?: any;
}

export interface CreateAtributoDto {
  nombre: string;
  clave: string;
  tipoDato: string;
  nivel?: string;
}

export interface CreateTipoAgrupadorDto {
  nombre: string;
  /** Si se omite, el backend usa true (asignable) por defecto. */
  asignable?: boolean;
  categoriaIds?: number[];
  subTipoIds?: number[];
}

export interface CreateEstadoDto {
  nombre: string;
  dominioId: number;
  /** Código estable opcional; si no viene, el backend lo deriva del nombre. */
  codigo?: string;
}

// --- Update DTOs (para editar desde la config de dominios) ---

export interface UpdateDominioDto {
  nombre: string;
  icono?: DominioIcono;
  color?: DominioColor;
}

// --- Update DTOs (catálogo del dominio: se edita desde el workspace) ---

export interface UpdateCategoriaDto {
  nombre?: string;
  tipoSeguimiento?: TipoSeguimiento;
}

export interface UpdateMarcaDto {
  nombre: string;
}

export interface UpdateModeloDto {
  nombre?: string;
  detalle?: string;
  marcaId?: number;
  categoriaId?: number;
  atributos?: any;
}

export interface UpdateTipoAgrupadorDto {
  nombre?: string;
  asignable?: boolean;
  categoriaIds?: number[];
  subTipoIds?: number[];
}

export interface UpdateAtributoDto {
  nombre?: string;
  clave?: string;
  tipoDato?: string;
  nivel?: string;
}

export interface UpdateEstadoDto {
  nombre: string;
}
