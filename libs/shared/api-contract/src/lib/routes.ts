/**
 * Fuente única de verdad de las rutas de la API REST.
 * Front y back deberían referenciar estas constantes en vez de hardcodear strings.
 *
 * Adopción incremental: en este primer corte se definen aquí y se documentan;
 * los servicios del front se migran a usarlas en un paso siguiente (ver ADR-0002).
 */
export const API_PREFIX = '/api';

export const API_ROUTES = {
  catalogos: {
    dominios: `${API_PREFIX}/catalogos/dominios`,
    categorias: `${API_PREFIX}/catalogos/categorias`,
    marcas: `${API_PREFIX}/catalogos/marcas`,
    modelos: `${API_PREFIX}/catalogos/modelos`,
    estados: `${API_PREFIX}/catalogos/estados`,
    atributos: (dominioId: number | string) =>
      `${API_PREFIX}/catalogos/dominios/${dominioId}/atributos`,
    tiposAgrupador: (dominioId: number | string) =>
      `${API_PREFIX}/catalogos/dominios/${dominioId}/tipos-agrupador`,
  },
  inventario: {
    articulos: `${API_PREFIX}/inventario/articulos`,
    lotes: `${API_PREFIX}/inventario/lotes`,
    consumirLote: (id: number | string) => `${API_PREFIX}/inventario/lotes/${id}/consumir`,
    adicionarLote: (id: number | string) => `${API_PREFIX}/inventario/lotes/${id}/adicionar`,
  },
  agrupadores: {
    base: `${API_PREFIX}/agrupadores`,
    byId: (id: number | string) => `${API_PREFIX}/agrupadores/${id}`,
    articulos: (id: number | string) => `${API_PREFIX}/agrupadores/${id}/articulos`,
    removeArticulo: (articuloId: number | string) =>
      `${API_PREFIX}/agrupadores/articulos/${articuloId}`,
    subagrupadores: (id: number | string) => `${API_PREFIX}/agrupadores/${id}/subagrupadores`,
    removeSubagrupador: (childId: number | string) =>
      `${API_PREFIX}/agrupadores/subagrupadores/${childId}`,
  },
  empleados: {
    base: `${API_PREFIX}/empleados`,
    areas: `${API_PREFIX}/empleados/areas`,
    login: `${API_PREFIX}/empleados/login`,
  },
  asignaciones: {
    base: `${API_PREFIX}/asignaciones`,
    articulos: `${API_PREFIX}/asignaciones/articulos`,
    agrupadores: `${API_PREFIX}/asignaciones/agrupadores`,
    consumibles: `${API_PREFIX}/asignaciones/consumibles`,
  },
  checklists: {
    base: `${API_PREFIX}/checklists`,
    byId: (id: number | string) => `${API_PREFIX}/checklists/${id}`,
    aspectos: (dominioId: number | string) =>
      `${API_PREFIX}/catalogos/dominios/${dominioId}/aspectos`,
    aspectosById: (dominioId: number | string, id: number | string) =>
      `${API_PREFIX}/catalogos/dominios/${dominioId}/aspectos/${id}`,
    instancias: `${API_PREFIX}/checklists/instancias`,
    instanciaById: (id: number | string) => `${API_PREFIX}/checklists/instancias/${id}`,
  },
} as const;
