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
  newModelo = { nombre: '', marcaId: null as number | null, categoriaId: null as number | null };
  editingModeloId: number | null = null;
  newAgrupador = { nombre: '', tipoAgrupadorId: null as number | null };
  newLote = { cantidadDisponible: 0, modeloId: null as number | null };
  selectedArticuloAgrupador: number | null = null;
  selectedLoteParaConsumo: any = null;
  cantidadAConsumir = 0;
  selectedLoteParaAdicion: any = null;
  cantidadAAdicionar = 0;

  // Sub-agrupadores state
  showSubAgrupadorDialog = false;
  selectedParentAgrupadorId: number | null = null;
  selectedParentAgrupadorNombre = '';
  selectedSubAgrupadorId: number | null = null;
  agrupadoresDisponibles: any[] = [];

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private catalogosService: CatalogosService,
    private inventarioService: InventarioService,
    private agrupadoresService: AgrupadoresService,
    private domainContext: DomainContextService,
    private notificaciones: NotificacionesUiService,
    private fb: FormBuilder
  ) {
    this.dynamicForm = this.fb.group({});
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
        const modelo = (art.modelo?.nombre || '').toLowerCase();
        const categoria = (art.modelo?.categoria?.nombre || '').toLowerCase();
        const estado = (art.estado?.nombre || art.estado || '').toLowerCase();
        const asignatario = this.getArticuloAsignatario(art).toLowerCase();
        const agrupador = (art.agrupador?.nombre || '').toLowerCase();

        return keywords.every(kw => 
          nroSerie.includes(kw) || 
          alias.includes(kw) || 
          modelo.includes(kw) || 
          categoria.includes(kw) || 
          estado.includes(kw) || 
          asignatario.includes(kw) ||
          agrupador.includes(kw)
        );
      });
    }

    return result;
  }

  get filteredLotes(): any[] {
    const query = this.searchLote.toLowerCase().trim();
    if (!query) return this.lotes;
    return this.lotes.filter(lote => {
      const modelo = (lote.modelo?.nombre || '').toLowerCase();
      const categoria = (lote.modelo?.categoria?.nombre || '').toLowerCase();
      return modelo.includes(query) || categoria.includes(query);
    });
  }

  get filteredCategorias(): Categoria[] {
    const query = this.searchCategoria.toLowerCase().trim();
    if (!query) return this.categorias;
    return this.categorias.filter(c => (c.nombre || '').toLowerCase().includes(query));
  }

  get filteredMarcas(): Marca[] {
    const query = this.searchMarca.toLowerCase().trim();
    if (!query) return this.marcas;
    return this.marcas.filter(m => (m.nombre || '').toLowerCase().includes(query));
  }

  get filteredModelos(): Modelo[] {
    const query = this.searchModelo.toLowerCase().trim();
    if (!query) return this.modelos;
    return this.modelos.filter(m => 
      (m.nombre || '').toLowerCase().includes(query) ||
      (m.marca?.nombre || '').toLowerCase().includes(query) ||
      (m.categoria?.nombre || '').toLowerCase().includes(query)
    );
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
    this.catalogosService.getCategorias(this.dominioId).subscribe(res => {
      if(res.success) this.categorias = res.data;
    });
    this.catalogosService.getMarcas(this.dominioId).subscribe(res => {
      if(res.success) this.marcas = res.data;
    });
    this.catalogosService.getModelos(undefined, this.dominioId).subscribe(res => {
      if(res.success) this.modelos = res.data;
    });
    this.catalogosService.getAtributos(this.dominioId).subscribe(res => {
      if(res.success) {
        this.atributosDominio = res.data;
        this.buildDynamicForm();
      }
    });
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
  }

  get modelosFiltradosBusqueda(): Modelo[] {
    if (!this.filterCategoriaId) return this.modelos;
    return this.modelos.filter(m => m.categoriaId === this.filterCategoriaId);
  }

  onFilterCategoriaChange() {
    this.filterModeloId = null;
    // Al cambiar (o limpiar) la categoría, se re-consulta la lista acotada a esa categoría.
    this.loadArticulos();
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
    this.selectedCategoriaId = null;
    this.selectedModeloId = null;
    this.nroSerie = '';
    this.alias = '';
    this.detalle = '';
    this.dynamicForm.reset();
    this.showNuevoDialog = true;
  }

  abrirEditarArticulo(art: any) {
    this.editingArticuloId = art.id;
    this.selectedCategoriaId = art.modelo?.categoriaId ?? null;
    this.onCategoriaChange(); // repuebla modelosFiltrados (y resetea selectedModeloId)
    this.selectedModeloId = art.modeloId ?? null;
    this.nroSerie = art.nroSerie || '';
    this.alias = art.alias || '';
    this.detalle = art.detalle || '';
    const patch: Record<string, any> = {};
    for (const attr of this.atributosDominio) {
      patch[attr.clave] = art.atributos?.[attr.clave] ?? '';
    }
    this.dynamicForm.reset();
    this.dynamicForm.patchValue(patch);
    this.showNuevoDialog = true;
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

    const esEdicion = !!this.editingArticuloId;
    const done = () => {
      this.notificaciones.exito(esEdicion ? 'Artículo actualizado.' : 'Artículo registrado en el inventario.');
      this.showNuevoDialog = false;
      this.editingArticuloId = null;
      this.loadArticulos();
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
    if (!attrId || !articulo?.atributos) return '';
    const def = this.atributosDominio.find(a => a.id === attrId);
    if (!def) return '';
    const val = articulo.atributos[def.clave];
    return val != null ? String(val) : '';
  }

  /** Definiciones de atributos del dominio que tienen valor en este artículo. */
  atributosConValor(articulo: any): AtributoDefinicion[] {
    return this.atributosDominio.filter(def => this.getAtributoValor(articulo, def.id) !== '');
  }

  verDetalleArticulo(art: any) {
    this.selectedArticuloDetalle = art;
    this.showDetalleArticuloDialog = true;
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
        const nombre = this.estadosArticulo.find(s => s.codigo === this.nuevoEstadoCodigo)?.nombre;
        this.notificaciones.exito(nombre ? `Estado cambiado a "${nombre}".` : 'Estado del artículo actualizado.');
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
    const esEdicion = !!this.editingCategoriaId;
    const done = () => {
      this.notificaciones.exito(esEdicion ? 'Categoría actualizada.' : 'Categoría creada.');
      this.showCategoriaDialog = false;
      this.editingCategoriaId = null;
      this.newCategoria = { nombre: '' };
      this.loadCatalogos();
    };
    if (this.editingCategoriaId) {
      this.catalogosService.updateCategoria(this.editingCategoriaId, { nombre: this.newCategoria.nombre }).subscribe(done);
    } else {
      this.catalogosService.createCategoria({nombre: this.newCategoria.nombre, dominioId: this.dominioId}).subscribe(done);
    }
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
    const esEdicion = !!this.editingMarcaId;
    const done = () => {
      this.notificaciones.exito(esEdicion ? 'Marca actualizada.' : 'Marca creada.');
      this.showMarcaDialog = false;
      this.editingMarcaId = null;
      this.newMarca = { nombre: '' };
      this.loadCatalogos();
    };
    if (this.editingMarcaId) {
      this.catalogosService.updateMarca(this.editingMarcaId, this.newMarca.nombre).subscribe(done);
    } else {
      this.catalogosService.createMarca({nombre: this.newMarca.nombre, dominioId: this.dominioId}).subscribe(done);
    }
  }

  abrirNuevoModelo() {
    this.editingModeloId = null;
    this.newModelo = { nombre: '', marcaId: null, categoriaId: null };
    this.showModeloDialog = true;
  }
  abrirEditarModelo(mod: any) {
    this.editingModeloId = mod.id;
    this.newModelo = { nombre: mod.nombre, marcaId: mod.marcaId ?? null, categoriaId: mod.categoriaId ?? null };
    this.showModeloDialog = true;
  }
  saveModelo() {
    if(!this.newModelo.nombre || !this.newModelo.marcaId || !this.newModelo.categoriaId) return;
    const data = {
      nombre: this.newModelo.nombre,
      marcaId: this.newModelo.marcaId,
      categoriaId: this.newModelo.categoriaId
    };
    const esEdicion = !!this.editingModeloId;
    const done = () => {
      this.notificaciones.exito(esEdicion ? 'Modelo actualizado.' : 'Modelo creado.');
      this.showModeloDialog = false;
      this.editingModeloId = null;
      this.newModelo = { nombre: '', marcaId: null, categoriaId: null };
      this.loadCatalogos();
    };
    if (this.editingModeloId) {
      this.catalogosService.updateModelo(this.editingModeloId, data).subscribe(done);
    } else {
      this.catalogosService.createModelo(data).subscribe(done);
    }
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
    this.agrupadoresService.createAgrupador({
      nombre: this.newAgrupador.nombre,
      tipoAgrupadorId: this.newAgrupador.tipoAgrupadorId
    }).subscribe({
      next: () => {
        this.notificaciones.exito(`Agrupador "${this.newAgrupador.nombre}" creado.`);
        this.showAgrupadorDialog = false;
        this.newAgrupador = { nombre: '', tipoAgrupadorId: null };
        this.loadAgrupadores();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo crear el agrupador.')
    });
  }

  abrirDialogoArticuloAgrupador(agrupadorId: number) {
    this.selectedAgrupadorId = agrupadorId;
    this.selectedArticuloAgrupador = null;
    // Cargar artículos libres (disponibles y sin agrupador) del dominio, on-demand.
    this.inventarioService.getArticulos(this.dominioId, 'Disponible').subscribe(res => {
      this.articulosLibres = res.success ? res.data.filter((a: any) => !a.agrupadorId) : [];
    });
    this.showArticuloAgrupadorDialog = true;
  }

  vincularArticuloAgrupador() {
    if(!this.selectedAgrupadorId || !this.selectedArticuloAgrupador) return;
    this.agrupadoresService.addArticulo(this.selectedAgrupadorId, this.selectedArticuloAgrupador).subscribe({
      next: () => {
        this.notificaciones.exito('Artículo vinculado al agrupador.');
        this.showArticuloAgrupadorDialog = false;
        this.loadAgrupadores();
        this.loadArticulos(); // Recargar articulos para ver cambios
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo vincular el artículo.')
    });
  }

  desvincularArticulo(articuloId: number) {
    this.agrupadoresService.removeArticulo(articuloId).subscribe({
      next: () => {
        this.notificaciones.exito('Artículo desvinculado del agrupador.');
        this.loadAgrupadores();
        this.loadArticulos();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo desvincular el artículo.')
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
    this.agrupadoresService.addSubAgrupador(this.selectedParentAgrupadorId, this.selectedSubAgrupadorId).subscribe({
      next: () => {
        this.notificaciones.exito(`Sub-agrupador vinculado a "${this.selectedParentAgrupadorNombre}".`);
        this.showSubAgrupadorDialog = false;
        this.loadAgrupadores();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo vincular el sub-agrupador.')
    });
  }

  desvincularSubAgrupador(childId: number) {
    this.agrupadoresService.removeSubAgrupador(childId).subscribe({
      next: () => {
        this.notificaciones.exito('Sub-agrupador desvinculado.');
        this.loadAgrupadores();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo desvincular el sub-agrupador.')
    });
  }

  saveLote() {
    if (this.newLote.cantidadDisponible <= 0 || !this.newLote.modeloId) return;
    this.inventarioService.createLote({
      cantidadDisponible: this.newLote.cantidadDisponible,
      modeloId: this.newLote.modeloId
    }).subscribe({
      next: () => {
        this.notificaciones.exito('Lote de stock registrado.');
        this.showLoteDialog = false;
        this.newLote = { cantidadDisponible: 0, modeloId: null };
        this.loadLotes();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo registrar el lote.')
    });
  }

  abrirConsumirLoteDialog(lote: any) {
    this.selectedLoteParaConsumo = lote;
    this.cantidadAConsumir = 1;
    this.showConsumirLoteDialog = true;
  }

  confirmarConsumoLote() {
    if (!this.selectedLoteParaConsumo || this.cantidadAConsumir <= 0 || this.cantidadAConsumir > this.selectedLoteParaConsumo.cantidadDisponible) return;
    
    this.inventarioService.consumirLote(this.selectedLoteParaConsumo.id, this.cantidadAConsumir).subscribe({
      next: () => {
        this.notificaciones.exito(`Se consumieron ${this.cantidadAConsumir} unidades del lote.`);
        this.showConsumirLoteDialog = false;
        this.selectedLoteParaConsumo = null;
        this.cantidadAConsumir = 0;
        this.loadLotes();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo consumir el lote.')
    });
  }

  abrirAdicionarLoteDialog(lote: any) {
    this.selectedLoteParaAdicion = lote;
    this.cantidadAAdicionar = 1;
    this.showAdicionarLoteDialog = true;
  }

  confirmarAdicionLote() {
    if (!this.selectedLoteParaAdicion || this.cantidadAAdicionar <= 0) return;
    
    this.inventarioService.adicionarLote(this.selectedLoteParaAdicion.id, this.cantidadAAdicionar).subscribe({
      next: () => {
        this.notificaciones.exito(`Se adicionaron ${this.cantidadAAdicionar} unidades al lote.`);
        this.showAdicionarLoteDialog = false;
        this.selectedLoteParaAdicion = null;
        this.cantidadAAdicionar = 0;
        this.loadLotes();
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo adicionar stock.')
    });
  }

}
