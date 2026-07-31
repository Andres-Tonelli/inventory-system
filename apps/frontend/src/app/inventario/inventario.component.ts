import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { CatalogosService, Categoria, Modelo, AtributoDefinicion, Marca, TipoAgrupador, EstadoArticulo } from '../core/services/catalogos.service';
import { InventarioService, Articulo } from '../core/services/inventario.service';
import { DomainContextService } from '../core/domain-context.service';
import { NotificacionesUiService } from '../core/notificaciones-ui.service';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Agrupador, AgrupadoresService } from '../core/services/agrupadores.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, SelectModule
  ],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.scss'
})
export class InventarioComponent implements OnInit {
  dominioId!: number;
  dominioNombre = '';

  // Navegación del workspace (dos niveles)
  activeMainTab: 'operar' | 'catalogo' = 'operar';
  activeSubTab = 'articulos'; // 'articulos' | 'consumibles' | 'agrupador-<tipoId>'
  activeCatTab: 'categorias' | 'marcas' | 'modelos' = 'categorias';

  // Master-detail de agrupadores
  selectedAgrupadorId: number | null = null;
  /** Offset vertical de la tarjeta de detalle: la ancla a la fila seleccionada. */
  detailTop = 0;
  @ViewChild('mdCard') mdCardRef?: ElementRef<HTMLElement>;

  articulos: Articulo[] = [];
  categorias: Categoria[] = [];
  marcas: Marca[] = [];
  modelos: Modelo[] = [];
  modelosFiltrados: Modelo[] = [];
  atributosDominio: AtributoDefinicion[] = [];
  atributosDetalle: AtributoDefinicion[] = [];
  tiposAgrupador: TipoAgrupador[] = [];
  agrupadores: Agrupador[] = [];
  agrupadoresPorTipo: { [key: number]: Agrupador[] } = {};
  lotes: any[] = [];

  // Dialog State
  showNuevoDialog = false;
  showCategoriaDialog = false;
  showMarcaDialog = false;
  showModeloDialog = false;
  showAgrupadorDialog = false;
  showArticuloAgrupadorDialog = false;
  showLoteDialog = false;
  showConsumirLoteDialog = false;
  showAdicionarLoteDialog = false;
  showDetalleArticuloDialog = false;
  selectedArticuloDetalle: any = null;

  // Cambio manual de estado
  showEstadoDialog = false;
  articuloParaEstado: any = null;
  nuevoEstadoCodigo: string | null = null;

  // New/edit item states (catálogo del dominio)
  newCategoria = { nombre: '' };
  editingCategoriaId: number | null = null;
  newMarca = { nombre: '' };
  editingMarcaId: number | null = null;
  newModelo = { nombre: '', detalle: '', marcaId: null as number | null, categoriaId: null as number | null, atributos: {} as any };
  editingModeloId: number | null = null;
  newAgrupador = { nombre: '', tipoAgrupadorId: null as number | null };
  newLote = { cantidadDisponible: 0, modeloId: null as number | null };
  selectedArticuloAgrupador: number | null = null;
  selectedLoteParaConsumo: any = null;
  cantidadAConsumir = 0;
  selectedLoteParaAdicion: any = null;
  cantidadAAdicionar = 0;

  // Filtros internos de diálogos
  selectedVincularCategoriaId: number | null = null;
  selectedLoteCategoriaId: number | null = null;

  get modelosFiltradosLote(): Modelo[] {
    if (!this.selectedLoteCategoriaId) return [];
    return this.modelos.filter(m => m.categoriaId === this.selectedLoteCategoriaId);
  }

  get articulosLibresFiltrados(): any[] {
    if (!this.selectedVincularCategoriaId) return [];
    return this.articulosLibres.filter((a: any) => a.modelo?.categoriaId === this.selectedVincularCategoriaId);
  }

  onLoteCategoriaChange() {
    this.newLote.modeloId = null;
    this.atributosLoteForm = [];
    this.loteModeloDynamicForm = this.fb.group({});
  }

  onVincularCategoriaChange() {
    this.selectedArticuloAgrupador = null;
  }

  abrirLoteDialog() {
    this.selectedLoteCategoriaId = null;
    this.newLote = { cantidadDisponible: 0, modeloId: null };
    this.atributosLoteForm = [];
    this.loteModeloDynamicForm = this.fb.group({});
    this.showLoteDialog = true;
  }

  onLoteModeloChange() {
    this.atributosLoteForm = [];
    this.loteModeloDynamicForm = this.fb.group({});
    if (!this.newLote.modeloId) return;
    const mod = this.modelos.find(m => m.id === this.newLote.modeloId);
    if (!mod) return;
    this.catalogosService.getAtributos(mod.categoriaId).subscribe(res => {
      if (res.success) {
        this.atributosLoteForm = res.data.filter((a: any) => a.nivel === 'ARTICULO');
        const group: any = {};
        for (const attr of this.atributosLoteForm) {
          group[attr.clave] = [''];
        }
        this.loteModeloDynamicForm = this.fb.group(group);
      }
    });
  }

  // Sub-agrupadores state
  showSubAgrupadorDialog = false;
  selectedParentAgrupadorId: number | null = null;
  selectedParentAgrupadorNombre = '';
  selectedSubAgrupadorId: number | null = null;
  agrupadoresDisponibles: any[] = [];

  // Expanded consumibles models
  expandedConsumibleGroups = new Set<number>();

  // Gestión de Atributos de Categoría
  showGestionAtributosDialog = false;
  selectedCategoriaParaAtributos: Categoria | null = null;
  categoriaAtributos: AtributoDefinicion[] = [];
  editingAtributoId: number | null = null;
  atributoForm = { nombre: '', clave: '', tipoDato: 'TEXTO', nivel: 'ARTICULO' };
  readonly tipoDatoOptions = [
    { label: 'Texto', value: 'TEXTO' },
    { label: 'Número', value: 'NUMERO' },
    { label: 'Fecha', value: 'FECHA' },
    { label: 'Booleano', value: 'BOOLEANO' },
  ];

  // Seleccion básica
  selectedCategoriaId: number | null = null;
  selectedModeloId: number | null = null;
  nroSerie = '';
  alias = '';
  detalle = '';
  editingArticuloId: number | null = null;

  // Filtros de búsqueda
  searchArticulo = '';
  searchLote = '';
  searchAgrupador = '';
  searchCategoria = '';
  searchMarca = '';
  searchModelo = '';

  // Variables de ordenamiento
  sortArtCol = '';
  sortArtAsc = true;
  sortCatCol = '';
  sortCatAsc = true;
  sortMarcaCol = '';
  sortMarcaAsc = true;
  sortModCol = '';
  sortModAsc = true;
  sortConsCol = '';
  sortConsAsc = true;
  sortAgrCol = '';
  sortAgrAsc = true;

  toggleSortArt(col: string) {
    if (this.sortArtCol === col) {
      this.sortArtAsc = !this.sortArtAsc;
    } else {
      this.sortArtCol = col;
      this.sortArtAsc = true;
    }
  }
  getSortArtIcon(col: string): string {
    if (this.sortArtCol !== col) return 'pi-sort';
    return this.sortArtAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  toggleSortCat(col: string) {
    if (this.sortCatCol === col) {
      this.sortCatAsc = !this.sortCatAsc;
    } else {
      this.sortCatCol = col;
      this.sortCatAsc = true;
    }
  }
  getSortCatIcon(col: string): string {
    if (this.sortCatCol !== col) return 'pi-sort';
    return this.sortCatAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  toggleSortMarca(col: string) {
    if (this.sortMarcaCol === col) {
      this.sortMarcaAsc = !this.sortMarcaAsc;
    } else {
      this.sortMarcaCol = col;
      this.sortMarcaAsc = true;
    }
  }
  getSortMarcaIcon(col: string): string {
    if (this.sortMarcaCol !== col) return 'pi-sort';
    return this.sortMarcaAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  toggleSortMod(col: string) {
    if (this.sortModCol === col) {
      this.sortModAsc = !this.sortModAsc;
    } else {
      this.sortModCol = col;
      this.sortModAsc = true;
    }
  }
  getSortModIcon(col: string): string {
    if (this.sortModCol !== col) return 'pi-sort';
    return this.sortModAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  toggleSortCons(col: string) {
    if (this.sortConsCol === col) {
      this.sortConsAsc = !this.sortConsAsc;
    } else {
      this.sortConsCol = col;
      this.sortConsAsc = true;
    }
  }
  getSortConsIcon(col: string): string {
    if (this.sortConsCol !== col) return 'pi-sort';
    return this.sortConsAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  toggleSortAgr(col: string) {
    if (this.sortAgrCol === col) {
      this.sortAgrAsc = !this.sortAgrAsc;
    } else {
      this.sortAgrCol = col;
      this.sortAgrAsc = true;
    }
  }
  getSortAgrIcon(col: string): string {
    if (this.sortAgrCol !== col) return 'pi-sort';
    return this.sortAgrAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  filterCategoriaId: number | null = null;
  filterModeloId: number | null = null;
  filterEstadoId: number | null = null;
  filterAsignatario = '';
  estadosArticulo: EstadoArticulo[] = [];

  filterAgrupadorEstado: string | null = null;
  filterAgrupadorAsignatario = '';
  estadosAgrupadorOptions = [
    { label: 'Disponible', value: 'DISPONIBLE' },
    { label: 'Asignado', value: 'ASIGNADO' }
  ];

  // Dinámica
  dynamicForm!: FormGroup;
  modeloDynamicForm!: FormGroup;
  loteModeloDynamicForm!: FormGroup;
  atributosModeloForm: AtributoDefinicion[] = [];
  atributosLoteForm: AtributoDefinicion[] = [];
  nivelOptions = [
    { label: 'Artículo (se define por unidad física)', value: 'ARTICULO' },
    { label: 'Modelo (se define una vez en el modelo)', value: 'MODELO' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private catalogosService: CatalogosService,
    private inventarioService: InventarioService,
    private agrupadoresService: AgrupadoresService,
    private domainContext: DomainContextService,
    private fb: FormBuilder,
    private notificaciones: NotificacionesUiService
  ) {
    this.dynamicForm = this.fb.group({});
    this.modeloDynamicForm = this.fb.group({});
    this.loteModeloDynamicForm = this.fb.group({});
  }

  // Candidatos para vincular a un agrupador. Se cargan on-demand al abrir el diálogo
  // (independiente de la categoría elegida en la lista de artículos).
  articulosLibres: any[] = [];

  get filteredArticulos(): Articulo[] {
    let result = this.articulos;

    // 1. Filtrar por Categoría
    if (this.filterCategoriaId) {
      result = result.filter(art => art.modelo?.categoriaId === this.filterCategoriaId);
    }

    // 2. Filtrar por Modelo
    if (this.filterModeloId) {
      result = result.filter(art => art.modeloId === this.filterModeloId);
    }

    // 3. Filtrar por Estado
    if (this.filterEstadoId) {
      result = result.filter(art => art.estadoId === this.filterEstadoId);
    }

    // 4. Filtrar por Asignatario (texto libre)
    if (this.filterAsignatario.trim()) {
      const q = this.filterAsignatario.toLowerCase().trim();
      result = result.filter(art => {
        const asignatario = this.getArticuloAsignatario(art).toLowerCase();
        return asignatario.includes(q);
      });
    }

    // 5. Filtrar por buscador multitérmino general (AND logic across fields)
    const query = this.searchArticulo.toLowerCase().trim();
    if (query) {
      const keywords = query.split(/\s+/);
      result = result.filter(art => {
        const nroSerie = (art.nroSerie || '').toLowerCase();
        const alias = (art.alias || '').toLowerCase();
        const categoria = (art.modelo?.categoria?.nombre || '').toLowerCase();
        const asignatario = this.getArticuloAsignatario(art).toLowerCase();
        const agrupador = (art.agrupador?.nombre || '').toLowerCase();

        const dynamicValues: string[] = [];
        if (art.atributos) {
          for (const val of Object.values(art.atributos)) {
            if (val != null) dynamicValues.push(String(val).toLowerCase());
          }
        }
        if (art.modelo?.atributos) {
          for (const val of Object.values(art.modelo.atributos)) {
            if (val != null) dynamicValues.push(String(val).toLowerCase());
          }
        }

        return keywords.every(kw => 
          nroSerie.includes(kw) || 
          alias.includes(kw) || 
          categoria.includes(kw) || 
          asignatario.includes(kw) ||
          agrupador.includes(kw) ||
          dynamicValues.some(val => val.includes(kw))
        );
      });
    }

    // 6. Ordenar
    if (this.sortArtCol) {
      result = [...result].sort((a, b) => {
        let valA: any;
        let valB: any;
        if (this.sortArtCol === 'modelo') {
          valA = a.modelo?.nombre || '';
          valB = b.modelo?.nombre || '';
        } else if (this.sortArtCol === 'categoria') {
          valA = a.modelo?.categoria?.nombre || '';
          valB = b.modelo?.categoria?.nombre || '';
        } else if (this.sortArtCol === 'estado') {
          valA = a.estado?.nombre || a.estado || '';
          valB = b.estado?.nombre || b.estado || '';
        } else if (this.sortArtCol === 'asignatario') {
          valA = this.getArticuloAsignatario(a);
          valB = this.getArticuloAsignatario(b);
        } else if (this.sortArtCol === 'agrupador') {
          valA = a.agrupador?.nombre || '';
          valB = b.agrupador?.nombre || '';
        } else {
          valA = (a as any)[this.sortArtCol];
          valB = (b as any)[this.sortArtCol];
        }
        valA = valA ? String(valA).toLowerCase() : '';
        valB = valB ? String(valB).toLowerCase() : '';
        return this.sortArtAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return result;
  }

  get filteredLotes(): any[] {
    const query = this.searchLote.toLowerCase().trim();
    if (!query) return this.lotes;
    const keywords = query.split(/\s+/);
    return this.lotes.filter(lote => {
      const modelo = (lote.modelo?.nombre || '').toLowerCase();
      const categoria = (lote.modelo?.categoria?.nombre || '').toLowerCase();
      
      const dynamicValues: string[] = [];
      if (lote.modelo?.atributos) {
        for (const val of Object.values(lote.modelo.atributos)) {
          if (val != null) dynamicValues.push(String(val).toLowerCase());
        }
      }

      return keywords.every(kw => 
        modelo.includes(kw) || 
        categoria.includes(kw) || 
        dynamicValues.some(val => val.includes(kw))
      );
    });
  }

  get consumiblesAgrupados(): any[] {
    const result = this.filteredLotes; 
    
    const map = new Map<number, any>();
    for (const lote of result) {
      if (!lote.modelo) continue;
      
      const mId = lote.modeloId;
      if (!map.has(mId)) {
        map.set(mId, {
          modelo: lote.modelo,
          totalDisponible: 0,
          lotes: [],
          expanded: false
        });
      }
      const group = map.get(mId);
      group.totalDisponible += lote.cantidadDisponible;
      group.lotes.push(lote);
    }
    
    let groups = Array.from(map.values());
    if (this.sortConsCol) {
      groups.sort((a, b) => {
        let valA: any;
        let valB: any;
        if (this.sortConsCol === 'modelo') {
          valA = a.modelo?.nombre || '';
          valB = b.modelo?.nombre || '';
        } else if (this.sortConsCol === 'categoria') {
          valA = a.modelo?.categoria?.nombre || '';
          valB = b.modelo?.categoria?.nombre || '';
        } else if (this.sortConsCol === 'totalDisponible') {
          valA = a.totalDisponible;
          valB = b.totalDisponible;
        }
        
        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = String(valB).toLowerCase();
          return this.sortConsAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
          return this.sortConsAsc ? (valA - valB) : (valB - valA);
        }
      });
    }
    return groups;
  }

  toggleConsumibleGroup(modeloId: number) {
    if (this.expandedConsumibleGroups.has(modeloId)) {
      this.expandedConsumibleGroups.delete(modeloId);
    } else {
      this.expandedConsumibleGroups.add(modeloId);
    }
  }

  get filteredCategorias(): Categoria[] {
    let result = this.categorias;
    const query = this.searchCategoria.toLowerCase().trim();
    if (query) {
      result = result.filter(c => (c.nombre || '').toLowerCase().includes(query));
    }
    if (this.sortCatCol) {
      result = [...result].sort((a, b) => {
        const valA = (a.nombre || '').toLowerCase();
        const valB = (b.nombre || '').toLowerCase();
        return this.sortCatAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }

  get filteredMarcas(): Marca[] {
    let result = this.marcas;
    const query = this.searchMarca.toLowerCase().trim();
    if (query) {
      result = result.filter(m => (m.nombre || '').toLowerCase().includes(query));
    }
    if (this.sortMarcaCol) {
      result = [...result].sort((a, b) => {
        const valA = (a.nombre || '').toLowerCase();
        const valB = (b.nombre || '').toLowerCase();
        return this.sortMarcaAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }

  get filteredModelos(): Modelo[] {
    let result = this.modelos;
    const query = this.searchModelo.toLowerCase().trim();
    if (query) {
      const keywords = query.split(/\s+/);
      result = result.filter(m => {
        const nombre = (m.nombre || '').toLowerCase();
        const detalle = ((m as any).detalle || '').toLowerCase();
        const marca = (m.marca?.nombre || '').toLowerCase();
        const categoria = (m.categoria?.nombre || '').toLowerCase();

        return keywords.every(kw => 
          nombre.includes(kw) || 
          detalle.includes(kw) || 
          marca.includes(kw) || 
          categoria.includes(kw)
        );
      });
    }
    if (this.sortModCol) {
      result = [...result].sort((a, b) => {
        let valA: any = (a as any)[this.sortModCol];
        let valB: any = (b as any)[this.sortModCol];
        
        if (this.sortModCol === 'marca') {
          valA = a.marca?.nombre || '';
          valB = b.marca?.nombre || '';
        } else if (this.sortModCol === 'categoria') {
          valA = a.categoria?.nombre || '';
          valB = b.categoria?.nombre || '';
        }
        
        valA = valA ? String(valA).toLowerCase() : '';
        valB = valB ? String(valB).toLowerCase() : '';
        return this.sortModAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }

  selectSubTab(tab: string): void {
    this.activeSubTab = tab;
    this.selectedAgrupadorId = null;
    this.detailTop = 0;
  }
  selectAgrupador(a: Agrupador, ev?: MouseEvent): void {
    this.selectedAgrupadorId = a.id ?? null;
    const row = (ev?.currentTarget as HTMLElement) ?? null;
    // Esperar al render del detalle nuevo para medir su altura real.
    setTimeout(() => this.posicionarDetalle(row));
  }

  /**
   * Ancla la tarjeta de detalle a la fila clickeada: centro de la tarjeta = centro
   * de la fila, sin salirse de los límites de la lista (cerca del fondo, el piso de
   * la tarjeta queda alineado con el piso de la lista/última fila).
   */
  private posicionarDetalle(row: HTMLElement | null): void {
    const card = this.mdCardRef?.nativeElement;
    const anchor = card?.parentElement;
    if (!card || !anchor || !row) { this.detailTop = 0; return; }
    const anchorRect = anchor.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const rowCenter = rowRect.top + rowRect.height / 2 - anchorRect.top;
    const cardH = card.offsetHeight;
    const maxTop = Math.max(0, anchor.offsetHeight - cardH);
    this.detailTop = Math.round(Math.min(Math.max(0, rowCenter - cardH / 2), maxTop));
  }
  get selectedAgrupadorDetalle(): any {
    return this.selectedAgrupadorId != null
      ? this.agrupadores.find((a) => a.id === this.selectedAgrupadorId) ?? null
      : null;
  }
  getAgrupadorAsignatario(ag: any): string {
    if (ag?.asignaciones && ag.asignaciones.length > 0) {
      return ag.asignaciones[0].empleado?.nombre || '';
    }
    return '';
  }
  estadoNombre(a: any): string {
    return a?.estado?.nombre || a?.estado || '';
  }
  estadoPillClass(a: any): Record<string, boolean> {
    const n = this.estadoNombre(a).toLowerCase();
    return {
      pill: true,
      green: n === 'disponible',
      blue: n === 'en uso',
      amber: n.includes('repara'),
      slate: n.includes('baja') || n.includes('fuera'),
    };
  }

  getAgrupadoresPorTipo(tipoId: number): Agrupador[] {
    let list = this.agrupadoresPorTipo[tipoId] || [];

    // 1. Filtrar por Estado del Agrupador
    if (this.filterAgrupadorEstado) {
      list = list.filter(a => a.estado === this.filterAgrupadorEstado);
    }

    // 2. Filtrar por Asignatario del Agrupador
    if (this.filterAgrupadorAsignatario.trim()) {
      const q = this.filterAgrupadorAsignatario.toLowerCase().trim();
      list = list.filter(a => {
        const empName = (a.asignaciones && a.asignaciones.length > 0)
          ? (a.asignaciones[0].empleado?.nombre || '')
          : '';
        return empName.toLowerCase().includes(q);
      });
    }

    // 3. Filtrar por buscador multitérmino general (AND logic across fields)
    const query = this.searchAgrupador.toLowerCase().trim();
    if (query) {
      const keywords = query.split(/\s+/);
      list = list.filter(a => {
        const nombre = (a.nombre || '').toLowerCase();
        const articulos = (a.articulos || []).map((art: any) => 
          `${art.alias || ''} ${art.nroSerie || ''} ${art.modelo?.nombre || ''}`.toLowerCase()
        ).join(' ');
        const subAgrupadores = (a.subAgrupadores || []).map((sub: any) => (sub.nombre || '').toLowerCase()).join(' ');
        const empName = (a.asignaciones && a.asignaciones.length > 0)
          ? (a.asignaciones[0].empleado?.nombre || '')
          : '';
        const empLegajo = (a.asignaciones && a.asignaciones.length > 0)
          ? (a.asignaciones[0].empleado?.legajo || '')
          : '';

        return keywords.every(kw => 
          nombre.includes(kw) || 
          articulos.includes(kw) || 
          subAgrupadores.includes(kw) ||
          empName.toLowerCase().includes(kw) ||
          empLegajo.toLowerCase().includes(kw)
        );
      });
    }

    // 4. Ordenar
    if (this.sortAgrCol) {
      list = [...list].sort((a, b) => {
        let valA: any;
        let valB: any;
        if (this.sortAgrCol === 'asignatario') {
          valA = this.getAgrupadorAsignatario(a);
          valB = this.getAgrupadorAsignatario(b);
        } else if (this.sortAgrCol === 'articulos') {
          valA = a.articulos?.length || 0;
          valB = b.articulos?.length || 0;
        } else {
          valA = (a as any)[this.sortAgrCol];
          valB = (b as any)[this.sortAgrCol];
        }

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = String(valB).toLowerCase();
          return this.sortAgrAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
          return this.sortAgrAsc ? (valA - valB) : (valB - valA);
        }
      });
    }

    return list;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('dominioId');
      if (id) {
        this.dominioId = Number(id);
        this.domainContext.setDomain(this.dominioId);
        this.loadArticulos();
        this.loadCatalogos();
      }
    });
  }

  goBack() {
    this.domainContext.clearDomain();
    this.router.navigate(['/']);
  }

  loadArticulos() {
    // Se exige elegir una categoría antes de consultar (acota la query). Ver pantalla de artículos.
    if (!this.filterCategoriaId) {
      this.articulos = [];
      return;
    }
    this.inventarioService.getArticulos(this.dominioId, undefined, this.filterCategoriaId).subscribe(res => {
      if(res.success) this.articulos = res.data;
    });
  }

  loadCatalogos() {
    this.catalogosService.getDominios().subscribe(res => {
      if (res.success) this.dominioNombre = res.data.find(d => d.id === this.dominioId)?.nombre || '';
    });
    this.loadCategorias();
    this.catalogosService.getMarcas(this.dominioId).subscribe(res => {
      if(res.success) this.marcas = res.data;
    });
    this.catalogosService.getModelos(undefined, this.dominioId).subscribe(res => {
      if(res.success) {
        this.modelos = res.data.map((m: any) => ({
          ...m,
          displayLabel: m.marca?.nombre ? `${m.marca.nombre} - ${m.nombre}` : m.nombre
        }));
      }
    });
    // Atributos definidos por categoría se cargan dinámicamente cuando el usuario elige la categoría
    this.loadAtributosCategoria();
    this.catalogosService.getTiposAgrupador(this.dominioId).subscribe(res => {
      if(res.success) {
        this.tiposAgrupador = res.data;
        this.loadAgrupadores();
      }
    });
    this.catalogosService.getEstados().subscribe(res => {
      if(res.success) this.estadosArticulo = res.data;
    });
    this.loadLotes();
  }

  loadLotes() {
    this.inventarioService.getLotes(this.dominioId).subscribe(res => {
      if (res.success) {
        this.lotes = res.data;
      }
    });
  }

  loadAgrupadores() {
    this.agrupadoresService.getAgrupadores(this.dominioId).subscribe(res => {
      if(res.success) {
        this.agrupadores = res.data;
        this.agrupadoresPorTipo = {};
        for (const tipo of this.tiposAgrupador) {
          if (tipo.id) {
             this.agrupadoresPorTipo[tipo.id] = this.agrupadores.filter(a => a.tipoAgrupadorId === tipo.id);
          }
        }
      }
    });
  }

  onCategoriaChange() {
    this.selectedModeloId = null;
    this.modelosFiltrados = this.modelos.filter(m => m.categoriaId === this.selectedCategoriaId);
    if (this.selectedCategoriaId) {
      this.catalogosService.getAtributos(this.selectedCategoriaId).subscribe(res => {
        if (res.success) {
          this.atributosDominio = res.data;
          this.buildDynamicForm();
        }
      });
    } else {
      this.atributosDominio = [];
      this.buildDynamicForm();
    }
  }

  loadCategorias() {
    this.catalogosService.getCategorias(this.dominioId).subscribe(res => {
      if (res.success) {
        this.categorias = res.data;
        if (this.selectedCategoriaParaAtributos) {
          const updatedCat = this.categorias.find(c => c.id === this.selectedCategoriaParaAtributos!.id);
          if (updatedCat) {
            this.selectedCategoriaParaAtributos = updatedCat;
            this.categoriaAtributos = updatedCat.atributos || [];
          }
        }
      }
    });
  }

  abrirGestionarAtributos(cat: Categoria) {
    this.selectedCategoriaParaAtributos = cat;
    this.categoriaAtributos = cat.atributos || [];
    this.editingAtributoId = null;
    this.atributoForm = { nombre: '', clave: '', tipoDato: 'TEXTO', nivel: 'ARTICULO' };
    this.showGestionAtributosDialog = true;
  }

  abrirEditarAtributoCategoria(attr: AtributoDefinicion) {
    this.editingAtributoId = attr.id ?? null;
    this.atributoForm = {
      nombre: attr.nombre,
      clave: attr.clave,
      tipoDato: attr.tipoDato,
      nivel: attr.nivel || 'ARTICULO'
    };
  }

  cancelarEdicionAtributo() {
    this.editingAtributoId = null;
    this.atributoForm = { nombre: '', clave: '', tipoDato: 'TEXTO', nivel: 'ARTICULO' };
  }

  guardarAtributoCategoria() {
    const nombre = this.atributoForm.nombre.trim();
    const clave = this.atributoForm.clave.trim();
    if (!nombre || !clave || !this.selectedCategoriaParaAtributos?.id) return;
    const catId = this.selectedCategoriaParaAtributos.id;
    const data = { nombre, clave, tipoDato: this.atributoForm.tipoDato, nivel: this.atributoForm.nivel };

    const done = () => {
      this.editingAtributoId = null;
      this.atributoForm = { nombre: '', clave: '', tipoDato: 'TEXTO', nivel: 'ARTICULO' };
      this.loadCategorias();
    };
    const onErr = (e: any) => this.notificaciones.errorHttp(e, 'No se pudo guardar el atributo.');

    if (this.editingAtributoId) {
      this.catalogosService.updateAtributo(this.editingAtributoId, data).subscribe({ next: done, error: onErr });
    } else {
      this.catalogosService.createAtributo(catId, data).subscribe({ next: done, error: onErr });
    }
  }

  eliminarAtributoCategoria(attr: AtributoDefinicion) {
    if (!attr.id) return;
    if (confirm(`¿Eliminar el atributo "${attr.nombre}"?`)) {
      this.catalogosService.deleteAtributo(attr.id).subscribe(() => {
        this.loadCategorias();
      });
    }
  }

  loadAtributosCategoria() {
    if (!this.filterCategoriaId) {
      this.atributosDominio = [];
      this.buildDynamicForm();
      return;
    }
    this.catalogosService.getAtributos(this.filterCategoriaId).subscribe(res => {
      if (res.success) {
        this.atributosDominio = res.data.filter((a: any) => a.nivel !== 'MODELO');
        this.buildDynamicForm();
      }
    });
  }

  get modelosFiltradosBusqueda(): Modelo[] {
    if (!this.filterCategoriaId) return this.modelos;
    return this.modelos.filter(m => m.categoriaId === this.filterCategoriaId);
  }

  onFilterCategoriaChange() {
    this.filterModeloId = null;
    // Al cambiar (o limpiar) la categoría, se re-consulta la lista acotada a esa categoría.
    this.loadArticulos();
    this.loadAtributosCategoria();
  }

  limpiarFiltros() {
    this.searchArticulo = '';
    this.filterCategoriaId = null;
    this.filterModeloId = null;
    this.filterEstadoId = null;
    this.filterAsignatario = '';
  }

  limpiarFiltrosAgrupador() {
    this.searchAgrupador = '';
    this.filterAgrupadorEstado = null;
    this.filterAgrupadorAsignatario = '';
  }

  buildDynamicForm() {
    const group: any = {};
    for (const attr of this.atributosDominio) {
      group[attr.clave] = [''];
    }
    this.dynamicForm = this.fb.group(group);
  }

  abrirDialogo() {
    this.editingArticuloId = null;
    this.selectedCategoriaId = this.filterCategoriaId;
    this.selectedModeloId = null;
    this.nroSerie = '';
    this.alias = '';
    this.detalle = '';
    
    if (this.selectedCategoriaId) {
      this.modelosFiltrados = this.modelos.filter(m => m.categoriaId === this.selectedCategoriaId);
      this.catalogosService.getAtributos(this.selectedCategoriaId).subscribe(res => {
        if (res.success) {
          this.atributosDominio = res.data.filter((a: any) => a.nivel !== 'MODELO');
          this.buildDynamicForm();
          this.showNuevoDialog = true;
        }
      });
    } else {
      this.modelosFiltrados = [];
      this.atributosDominio = [];
      this.buildDynamicForm();
      this.showNuevoDialog = true;
    }
  }

  abrirEditarArticulo(art: any) {
    this.editingArticuloId = art.id;
    this.selectedCategoriaId = art.modelo?.categoriaId ?? null;
    this.selectedModeloId = art.modeloId ?? null;
    this.nroSerie = art.nroSerie || '';
    this.alias = art.alias || '';
    this.detalle = art.detalle || '';
    
    if (this.selectedCategoriaId) {
      this.modelosFiltrados = this.modelos.filter(m => m.categoriaId === this.selectedCategoriaId);
      this.catalogosService.getAtributos(this.selectedCategoriaId).subscribe(res => {
        if (res.success) {
          this.atributosDominio = res.data.filter((a: any) => a.nivel !== 'MODELO');
          this.buildDynamicForm();
          
          const patch: Record<string, any> = {};
          for (const attr of this.atributosDominio) {
            patch[attr.clave] = art.atributos?.[attr.clave] ?? '';
          }
          this.dynamicForm.patchValue(patch);
          this.showNuevoDialog = true;
        }
      });
    } else {
      this.modelosFiltrados = [];
      this.atributosDominio = [];
      this.buildDynamicForm();
      this.showNuevoDialog = true;
    }
  }

  guardarArticulo() {
    if(!this.selectedModeloId || !this.alias) return;

    const formValues = this.dynamicForm.value;
    // Atributos dinámicos como objeto { clave: valor } (JSONB). Ver ADR-0004 D1.
    const atributos: Record<string, any> = {};
    for (const attr of this.atributosDominio) {
      const valor = formValues[attr.clave];
      if (valor != null && valor !== '') atributos[attr.clave] = valor;
    }

    const payload: any = {
      nroSerie: this.nroSerie.trim() || null,
      alias: this.alias.trim() || null,
      detalle: this.detalle.trim() || null,
      modeloId: this.selectedModeloId,
      atributos
    };

    const done = () => {
      this.showNuevoDialog = false;
      this.editingArticuloId = null;
      this.loadArticulos();
      this.loadAtributosCategoria();
      this.loadAgrupadores();
    };
    const onErr = (e: any) => this.notificaciones.errorHttp(e, 'No se pudo guardar el artículo.');

    if (this.editingArticuloId) {
      this.inventarioService.updateArticulo(this.editingArticuloId, payload).subscribe({ next: done, error: onErr });
    } else {
      payload.estadoCodigo = 'DISPONIBLE';
      this.inventarioService.createArticulo(payload).subscribe({ next: done, error: onErr });
    }
  }

  getAtributoValor(articulo: any, attrId: number | undefined): string {
    if (!attrId || !articulo) return '';
    const def = this.atributosDominio.find(a => a.id === attrId);
    if (!def) return '';
    if (def.nivel === 'MODELO') {
      const val = articulo.modelo?.atributos?.[def.clave];
      return val != null ? String(val) : '';
    } else {
      const val = articulo.atributos?.[def.clave];
      return val != null ? String(val) : '';
    }
  }

  getAtributoValorDetalle(articulo: any, attrId: number | undefined): string {
    if (!attrId || !articulo) return '';
    const def = this.atributosDetalle.find(a => a.id === attrId);
    if (!def) return '';
    if (def.nivel === 'MODELO') {
      const val = articulo.modelo?.atributos?.[def.clave];
      return val != null ? String(val) : '';
    } else {
      const val = articulo.atributos?.[def.clave];
      return val != null ? String(val) : '';
    }
  }

  /** Definiciones de atributos del dominio que tienen valor en este artículo. */
  atributosConValor(articulo: any): AtributoDefinicion[] {
    return this.atributosDetalle.filter(def => this.getAtributoValorDetalle(articulo, def.id) !== '');
  }

  verDetalleArticulo(art: any) {
    this.selectedArticuloDetalle = art;
    const catId = art.modelo?.categoriaId;
    if (catId) {
      this.catalogosService.getAtributos(catId).subscribe(res => {
        if (res.success) {
          this.atributosDetalle = res.data;
          this.showDetalleArticuloDialog = true;
        }
      });
    } else {
      this.atributosDetalle = [];
      this.showDetalleArticuloDialog = true;
    }
  }

  abrirCambiarEstado(art: any) {
    this.articuloParaEstado = art;
    this.nuevoEstadoCodigo = art?.estado?.codigo ?? null;
    this.showEstadoDialog = true;
  }

  guardarEstado() {
    if (!this.articuloParaEstado?.id || !this.nuevoEstadoCodigo) return;
    this.inventarioService.cambiarEstadoArticulo(this.articuloParaEstado.id, this.nuevoEstadoCodigo).subscribe({
      next: () => {
        this.showEstadoDialog = false;
        this.articuloParaEstado = null;
        this.loadArticulos();
        this.loadAgrupadores();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo cambiar el estado.')
    });
  }

  getArticuloAsignatario(art: any): string {
    if (!art) return '';
    
    // 1. Direct assignment
    if (art.asignaciones && art.asignaciones.length > 0) {
      const emp = art.asignaciones[0].empleado;
      return emp ? emp.nombre : '';
    }
    
    // 2. Assignment through agrupador
    if (art.agrupador && art.agrupador.asignaciones && art.agrupador.asignaciones.length > 0) {
      const emp = art.agrupador.asignaciones[0].empleado;
      return emp ? `${emp.nombre} (vía ${art.agrupador.nombre})` : '';
    }
    
    return '';
  }

  hasModelSpecs(modelo: any): boolean {
    if (!modelo?.atributos || !modelo?.categoriaId) return false;
    const cat = this.categorias.find(c => c.id === modelo.categoriaId);
    if (!cat?.atributos) return false;
    return cat.atributos.some((a: any) => a.nivel === 'MODELO' && modelo.atributos[a.clave] != null && modelo.atributos[a.clave] !== '');
  }

  getModelSpecsList(modelo: any): { nombre: string, valor: string }[] {
    if (!modelo?.atributos || !modelo?.categoriaId) return [];
    const cat = this.categorias.find(c => c.id === modelo.categoriaId);
    if (!cat?.atributos) return [];
    
    return cat.atributos
      .filter((a: any) => a.nivel === 'MODELO' && modelo.atributos[a.clave] != null && modelo.atributos[a.clave] !== '')
      .map((a: any) => ({
        nombre: a.nombre,
        valor: String(modelo.atributos[a.clave])
      }));
  }

  getLoteSpecsText(lote: any): string {
    if (!lote?.atributos || !lote?.modelo?.categoriaId) return '';
    const cat = this.categorias.find(c => c.id === lote.modelo.categoriaId);
    if (!cat?.atributos) return '';
    
    const parts: string[] = [];
    for (const attr of cat.atributos) {
      if (attr.nivel === 'ARTICULO') {
        const val = lote.atributos[attr.clave];
        if (val != null && val !== '') {
          parts.push(`${attr.nombre}: ${val}`);
        }
      }
    }
    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  }

  // --- CATALOGOS DENTRO DEL DOMINIO ---
  abrirNuevaCategoria() {
    this.editingCategoriaId = null;
    this.newCategoria = { nombre: '' };
    this.showCategoriaDialog = true;
  }
  abrirEditarCategoria(cat: any) {
    this.editingCategoriaId = cat.id;
    this.newCategoria = { nombre: cat.nombre };
    this.showCategoriaDialog = true;
  }
  saveCategoria() {
    if(!this.newCategoria.nombre) return;
    const done = () => {
      this.showCategoriaDialog = false;
      this.editingCategoriaId = null;
      this.newCategoria = { nombre: '' };
      this.loadCatalogos();
    };
    const onErr = (e: any) => this.notificaciones.errorHttp(e, 'No se pudo guardar la categoría.');
    if (this.editingCategoriaId) {
      this.catalogosService.updateCategoria(this.editingCategoriaId, { nombre: this.newCategoria.nombre }).subscribe({ next: done, error: onErr });
    } else {
      this.catalogosService.createCategoria({nombre: this.newCategoria.nombre, dominioId: this.dominioId}).subscribe({ next: done, error: onErr });
    }
  }

  eliminarCategoria(id: number) {
    if (!window.confirm('¿Estás seguro de que querés eliminar esta categoría?')) return;
    this.catalogosService.deleteCategoria(id).subscribe({
      next: () => {
        this.notificaciones.exito('Categoría eliminada con éxito');
        this.loadCatalogos();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo eliminar la categoría.')
    });
  }

  abrirNuevaMarca() {
    this.editingMarcaId = null;
    this.newMarca = { nombre: '' };
    this.showMarcaDialog = true;
  }
  abrirEditarMarca(marca: any) {
    this.editingMarcaId = marca.id;
    this.newMarca = { nombre: marca.nombre };
    this.showMarcaDialog = true;
  }
  saveMarca() {
    if(!this.newMarca.nombre) return;
    const done = () => {
      this.showMarcaDialog = false;
      this.editingMarcaId = null;
      this.newMarca = { nombre: '' };
      this.loadCatalogos();
    };
    const onErr = (e: any) => this.notificaciones.errorHttp(e, 'No se pudo guardar la marca.');
    if (this.editingMarcaId) {
      this.catalogosService.updateMarca(this.editingMarcaId, this.newMarca.nombre).subscribe({ next: done, error: onErr });
    } else {
      this.catalogosService.createMarca({nombre: this.newMarca.nombre, dominioId: this.dominioId}).subscribe({ next: done, error: onErr });
    }
  }

  eliminarMarca(id: number) {
    if (!window.confirm('¿Estás seguro de que querés eliminar esta marca?')) return;
    this.catalogosService.deleteMarca(id).subscribe({
      next: () => {
        this.notificaciones.exito('Marca eliminada con éxito');
        this.loadCatalogos();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo eliminar la marca.')
    });
  }

  abrirNuevoModelo() {
    this.editingModeloId = null;
    this.newModelo = { nombre: '', detalle: '', marcaId: null, categoriaId: null, atributos: {} };
    this.atributosModeloForm = [];
    this.buildModeloDynamicForm();
    this.showModeloDialog = true;
  }
  abrirEditarModelo(mod: any) {
    this.editingModeloId = mod.id;
    this.newModelo = {
      nombre: mod.nombre,
      detalle: mod.detalle ?? '',
      marcaId: mod.marcaId ?? null,
      categoriaId: mod.categoriaId ?? null,
      atributos: mod.atributos ?? {}
    };
    this.atributosModeloForm = [];
    if (this.newModelo.categoriaId) {
      const cat = this.categorias.find(c => c.id === this.newModelo.categoriaId);
      const isConsumible = cat?.tipoSeguimiento === 'POR_LOTE';
      this.catalogosService.getAtributos(this.newModelo.categoriaId).subscribe(res => {
        if (res.success) {
          this.atributosModeloForm = isConsumible
            ? res.data
            : res.data.filter((a: any) => a.nivel === 'MODELO');
          this.buildModeloDynamicForm();
          const patch: Record<string, any> = {};
          for (const attr of this.atributosModeloForm) {
            patch[attr.clave] = this.newModelo.atributos?.[attr.clave] ?? '';
          }
          this.modeloDynamicForm.patchValue(patch);
          this.showModeloDialog = true;
        }
      });
    } else {
      this.buildModeloDynamicForm();
      this.showModeloDialog = true;
    }
  }
  onModeloCategoriaChange() {
    this.atributosModeloForm = [];
    if (this.newModelo.categoriaId) {
      const cat = this.categorias.find(c => c.id === this.newModelo.categoriaId);
      const isConsumible = cat?.tipoSeguimiento === 'POR_LOTE';
      this.catalogosService.getAtributos(this.newModelo.categoriaId).subscribe(res => {
        if (res.success) {
          this.atributosModeloForm = isConsumible
            ? res.data
            : res.data.filter((a: any) => a.nivel === 'MODELO');
          this.buildModeloDynamicForm();
        }
      });
    } else {
      this.buildModeloDynamicForm();
    }
  }
  buildModeloDynamicForm() {
    const group: any = {};
    for (const attr of this.atributosModeloForm) {
      group[attr.clave] = [''];
    }
    this.modeloDynamicForm = this.fb.group(group);
  }
  saveModelo() {
    if(!this.newModelo.nombre || !this.newModelo.marcaId || !this.newModelo.categoriaId) return;
    const formValues = this.modeloDynamicForm.value;
    const atributos: Record<string, any> = {};
    for (const attr of this.atributosModeloForm) {
      const valor = formValues[attr.clave];
      if (valor != null && valor !== '') atributos[attr.clave] = valor;
    }

    const data = {
      nombre: this.newModelo.nombre,
      detalle: this.newModelo.detalle || undefined,
      marcaId: this.newModelo.marcaId,
      categoriaId: this.newModelo.categoriaId,
      atributos
    };
    const done = () => {
      this.showModeloDialog = false;
      this.editingModeloId = null;
      this.newModelo = { nombre: '', detalle: '', marcaId: null, categoriaId: null, atributos: {} };
      this.loadCatalogos();
    };
    const onErr = (e: any) => this.notificaciones.errorHttp(e, 'No se pudo guardar el modelo.');
    if (this.editingModeloId) {
      this.catalogosService.updateModelo(this.editingModeloId, data).subscribe({ next: done, error: onErr });
    } else {
      this.catalogosService.createModelo(data).subscribe({ next: done, error: onErr });
    }
  }

  eliminarModelo(id: number) {
    if (!window.confirm('¿Estás seguro de que querés eliminar este modelo?')) return;
    this.catalogosService.deleteModelo(id).subscribe({
      next: () => {
        this.notificaciones.exito('Modelo eliminado con éxito');
        this.loadCatalogos();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo eliminar el modelo.')
    });
  }

  // --- AGRUPADORES ---
  abrirDialogoNuevoAgrupador(tipoId?: number) {
    if (tipoId) {
      this.newAgrupador.tipoAgrupadorId = tipoId;
      this.showAgrupadorDialog = true;
    }
  }

  saveAgrupador() {
    if(!this.newAgrupador.nombre || !this.newAgrupador.tipoAgrupadorId) return;
    const done = () => {
      this.showAgrupadorDialog = false;
      this.newAgrupador = { nombre: '', tipoAgrupadorId: null };
      this.loadAgrupadores();
    };
    const onErr = (e: any) => this.notificaciones.errorHttp(e, 'No se pudo guardar el agrupador.');
    this.agrupadoresService.createAgrupador({
      nombre: this.newAgrupador.nombre,
      tipoAgrupadorId: this.newAgrupador.tipoAgrupadorId
    }).subscribe({ next: done, error: onErr });
  }

  abrirDialogoArticuloAgrupador(agrupadorId: number, categoryId?: number) {
    this.selectedAgrupadorId = agrupadorId;
    this.selectedArticuloAgrupador = null;
    this.selectedVincularCategoriaId = categoryId || null;
    // Cargar artículos libres (disponibles y sin agrupador) del dominio, on-demand.
    this.inventarioService.getArticulos(this.dominioId, 'Disponible').subscribe(res => {
      this.articulosLibres = res.success 
        ? res.data.filter((a: any) => !a.agrupadorId).map((a: any) => ({
            ...a,
            displayLabel: `${a.alias || 'Sin Alias'} - ${a.modelo?.marca?.nombre || 'Sin marca'} ${a.modelo?.nombre || 'Sin modelo'} (S/N: ${a.nroSerie || 'Sin Serie'})`
          }))
        : [];
    });
    this.showArticuloAgrupadorDialog = true;
  }

  getPredefinedSlots(ag: any): any[] {
    if (!ag || !ag.tipoAgrupador?.categoriasRecomendadas) return [];
    return ag.tipoAgrupador.categoriasRecomendadas.map((cr: any) => {
      const cat = cr.categoria;
      const articulo = (ag.articulos || []).find((art: any) => art.modelo?.categoriaId === cat.id);
      return {
        categoria: cat,
        articulo: articulo || null
      };
    });
  }

  getAdditionalArticles(ag: any): any[] {
    if (!ag) return [];
    const recCatIds = new Set(
      (ag.tipoAgrupador?.categoriasRecomendadas || []).map((cr: any) => cr.categoria.id).filter(Boolean)
    );
    return (ag.articulos || []).filter((art: any) => !recCatIds.has(art.modelo?.categoriaId));
  }

  vincularArticuloAgrupador() {
    if(!this.selectedAgrupadorId || !this.selectedArticuloAgrupador) return;
    this.agrupadoresService.addArticulo(this.selectedAgrupadorId, this.selectedArticuloAgrupador).subscribe(() => {
      this.showArticuloAgrupadorDialog = false;
      this.loadAgrupadores();
      this.loadArticulos(); // Recargar articulos para ver cambios
    });
  }

  desvincularArticulo(articuloId: number) {
    this.agrupadoresService.removeArticulo(articuloId).subscribe(() => {
      this.loadAgrupadores();
      this.loadArticulos();
    });
  }

  abrirDialogoSubAgrupador(parent: any) {
    this.selectedParentAgrupadorId = parent.id;
    this.selectedParentAgrupadorNombre = parent.nombre;
    this.selectedSubAgrupadorId = null;
    
    // Filtrar todos los agrupadores que no tienen padre asignado y no son el padre mismo
    this.agrupadoresDisponibles = this.agrupadores
      .filter(a => a.id !== parent.id && !a.agrupadorPadreId)
      .map(a => ({
        ...a,
        displayLabel: `${a.tipoAgrupador?.nombre || 'Agrupador'} - ${a.nombre}`
      }));
      
    this.showSubAgrupadorDialog = true;
  }

  vincularSubAgrupador() {
    if (!this.selectedParentAgrupadorId || !this.selectedSubAgrupadorId) return;
    this.agrupadoresService.addSubAgrupador(this.selectedParentAgrupadorId, this.selectedSubAgrupadorId).subscribe(() => {
      this.showSubAgrupadorDialog = false;
      this.loadAgrupadores();
    });
  }

  desvincularSubAgrupador(childId: number) {
    this.agrupadoresService.removeSubAgrupador(childId).subscribe(() => {
      this.loadAgrupadores();
    });
  }

  saveLote() {
    if (this.newLote.cantidadDisponible <= 0 || !this.newLote.modeloId) return;
    
    // Extract Dynamic Lot-level (Article-level) Attributes
    const formValues = this.loteModeloDynamicForm.value;
    const atributos: Record<string, any> = {};
    for (const attr of this.atributosLoteForm) {
      const valor = formValues[attr.clave];
      if (valor != null && valor !== '') atributos[attr.clave] = valor;
    }
    
    this.inventarioService.createLote({
      cantidadDisponible: this.newLote.cantidadDisponible,
      modeloId: this.newLote.modeloId!,
      atributos
    }).subscribe({
      next: () => {
        this.showLoteDialog = false;
        this.newLote = { cantidadDisponible: 0, modeloId: null };
        this.atributosLoteForm = [];
        this.loteModeloDynamicForm = this.fb.group({});
        this.loadLotes();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo guardar el lote de stock.')
    });
  }

  abrirConsumirLoteDialog(lote: any) {
    this.selectedLoteParaConsumo = lote;
    this.cantidadAConsumir = 1;
    this.showConsumirLoteDialog = true;
  }

  confirmarConsumoLote() {
    if (!this.selectedLoteParaConsumo || this.cantidadAConsumir <= 0 || this.cantidadAConsumir > this.selectedLoteParaConsumo.cantidadDisponible) return;
    
    this.inventarioService.consumirLote(this.selectedLoteParaConsumo.id, this.cantidadAConsumir).subscribe(() => {
      this.showConsumirLoteDialog = false;
      this.selectedLoteParaConsumo = null;
      this.cantidadAConsumir = 0;
      this.loadLotes();
    });
  }

  abrirAdicionarLoteDialog(lote: any) {
    this.selectedLoteParaAdicion = lote;
    this.cantidadAAdicionar = 1;
    this.showAdicionarLoteDialog = true;
  }

  confirmarAdicionLote() {
    if (!this.selectedLoteParaAdicion || this.cantidadAAdicionar <= 0) return;
    
    this.inventarioService.adicionarLote(this.selectedLoteParaAdicion.id, this.cantidadAAdicionar).subscribe(() => {
      this.showAdicionarLoteDialog = false;
      this.selectedLoteParaAdicion = null;
      this.cantidadAAdicionar = 0;
      this.loadLotes();
    });
  }

}
