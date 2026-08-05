import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AsignacionesService, Asignacion } from '../core/services/asignaciones.service';
import { EmpleadosService, Empleado } from '../core/services/empleados.service';
import { InventarioService, Articulo } from '../core/services/inventario.service';
import { AgrupadoresService, Agrupador } from '../core/services/agrupadores.service';
import { CatalogosService, TipoAgrupador } from '../core/services/catalogos.service';
import { DomainContextService } from '../core/domain-context.service';
import { NotificacionesUiService } from '../core/notificaciones-ui.service';
import { ConfirmacionUiService } from '../core/confirmacion-ui.service';
import { PaginadorComponent, paginar } from '../core/ui/paginador.component';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, DialogModule, SelectModule, InputTextModule,
    TooltipModule, PaginadorComponent
  ],
  templateUrl: './asignaciones.component.html',
  styleUrl: './asignaciones.component.scss'
})
export class AsignacionesComponent implements OnInit {
  asignaciones: any[] = [];
  empleados: Empleado[] = [];
  articulosDisponibles: Articulo[] = [];
  agrupadoresDisponibles: Agrupador[] = [];
  lotesDisponibles: any[] = [];
  
  // Catálogos cargados para selección escalonada
  categorias: any[] = [];
  modelos: any[] = [];

  // Selección escalonada de consumibles
  selectedConsumibleCategoriaId: number | null = null;
  selectedConsumibleModeloId: number | null = null;
  selectedConsumibleLoteId: number | null = null;

  get modelosFiltradosAsignacion(): any[] {
    if (!this.selectedConsumibleCategoriaId) return [];
    return this.modelos.filter(m => m.categoriaId === this.selectedConsumibleCategoriaId);
  }

  get lotesFiltradosAsignacion(): any[] {
    if (!this.selectedConsumibleModeloId) return [];
    return this.lotesDisponibles.filter(l => l.modeloId === this.selectedConsumibleModeloId);
  }

  onConsumibleCategoriaChange() {
    this.selectedConsumibleModeloId = null;
    this.selectedConsumibleLoteId = null;
    this.newAsignacion.itemId = null;
  }

  onConsumibleModeloChange() {
    this.selectedConsumibleLoteId = null;
    this.newAsignacion.itemId = null;
  }

  onConsumibleLoteChange() {
    this.newAsignacion.itemId = this.selectedConsumibleLoteId;
  }

  showNuevoDialog = false;
  activeTab: 'articulos' | 'agrupadores' | 'consumibles' = 'articulos';
  /** Activas = fechaDevolucion null; Historial = lo ya devuelto. */
  vista: 'activas' | 'historial' = 'activas';
  tipoAsignacion: 'ARTICULO' | 'AGRUPADOR' | 'CONSUMIBLE' = 'ARTICULO';

  // Conjuntos: hay que elegir un tipo de conjunto antes de listar.
  tiposAgrupador: TipoAgrupador[] = [];
  selectedTipoConjunto: number | null = null;

  // Variables de paginación
  paginaArticulos = 1;
  paginaAgrupadores = 1;
  paginaConsumibles = 1;

  newAsignacion = {
    empleadoId: null as number | null,
    itemId: null as number | null,
    observaciones: '',
    cantidad: 1
  };

  get totalAsignaciones(): number {
    return this.totalArticulos + this.totalAgrupadores + this.totalConsumibles;
  }

  get totalArticulos(): number {
    return this.asignaciones.filter(a => a.articuloId && !a.fechaDevolucion).length;
  }

  get totalAgrupadores(): number {
    return this.asignaciones.filter(a => a.agrupadorId && !a.fechaDevolucion).length;
  }

  get totalConsumibles(): number {
    return this.asignaciones.filter(a => a.cantidadEntregada != null).length;
  }

  get asignacionesArticulos(): any[] {
    return this.asignaciones.filter(a => a.articuloId != null);
  }

  get asignacionesAgrupadores(): any[] {
    return this.asignaciones.filter(a => a.agrupadorId != null);
  }

  get entregasConsumibles(): any[] {
    return this.asignaciones.filter(a => a.cantidadEntregada != null);
  }

  // Filtros de búsqueda
  searchArticulo = '';
  searchAgrupador = '';
  searchConsumible = '';

  /** Aplica la vista Activas | Historial sobre una lista de asignaciones. */
  private porVista(list: any[]): any[] {
    return list.filter(a => (this.vista === 'historial' ? !!a.fechaDevolucion : !a.fechaDevolucion));
  }

  get filteredAsignacionesArticulos(): any[] {
    const list = this.porVista(this.asignacionesArticulos);
    const query = this.searchArticulo.toLowerCase().trim();
    if (!query) return list;
    return list.filter(asig => {
      const nroSerie = (asig.articulo?.nroSerie || '').toLowerCase();
      const alias = (asig.articulo?.alias || '').toLowerCase();
      const modelo = (asig.articulo?.modelo?.nombre || '').toLowerCase();
      const empleado = (asig.empleado?.nombre || '').toLowerCase();
      const area = (asig.empleado?.area?.nombre || '').toLowerCase();
      const observaciones = (asig.observaciones || '').toLowerCase();
      return nroSerie.includes(query) ||
             alias.includes(query) ||
             modelo.includes(query) ||
             empleado.includes(query) ||
             area.includes(query) ||
             observaciones.includes(query);
    });
  }

  get filteredAsignacionesAgrupadores(): any[] {
    // Requiere elegir un tipo de conjunto primero.
    if (!this.selectedTipoConjunto) return [];
    const list = this.porVista(this.asignacionesAgrupadores).filter(
      asig => asig.agrupador?.tipoAgrupador?.id === this.selectedTipoConjunto
    );
    const query = this.searchAgrupador.toLowerCase().trim();
    if (!query) return list;
    return list.filter(asig => {
      const nombre = (asig.agrupador?.nombre || '').toLowerCase();
      const tipo = (asig.agrupador?.tipoAgrupador?.nombre || '').toLowerCase();
      const empleado = (asig.empleado?.nombre || '').toLowerCase();
      const area = (asig.empleado?.area?.nombre || '').toLowerCase();
      const observaciones = (asig.observaciones || '').toLowerCase();
      return nombre.includes(query) ||
             tipo.includes(query) ||
             empleado.includes(query) ||
             area.includes(query) ||
             observaciones.includes(query);
    });
  }

  get filteredEntregasConsumibles(): any[] {
    const list = this.entregasConsumibles;
    const query = this.searchConsumible.toLowerCase().trim();
    if (!query) return list;
    return list.filter(asig => {
      const modelo = (asig.lote?.modelo?.nombre || '').toLowerCase();
      const cantidad = String(asig.cantidadEntregada || '');
      const empleado = (asig.empleado?.nombre || '').toLowerCase();
      const area = (asig.empleado?.area?.nombre || '').toLowerCase();
      return modelo.includes(query) ||
             cantidad.includes(query) ||
             empleado.includes(query) ||
             area.includes(query);
    });
  }

  get paginatedAsignacionesArticulos(): any[] {
    return paginar(this.filteredAsignacionesArticulos, this.paginaArticulos);
  }

  get paginatedAsignacionesAgrupadores(): any[] {
    return paginar(this.filteredAsignacionesAgrupadores, this.paginaAgrupadores);
  }

  get paginatedEntregasConsumibles(): any[] {
    return paginar(this.filteredEntregasConsumibles, this.paginaConsumibles);
  }

  constructor(
    private asignacionesService: AsignacionesService,
    private empleadosService: EmpleadosService,
    private inventarioService: InventarioService,
    private agrupadoresService: AgrupadoresService,
    private catalogosService: CatalogosService,
    private domainContext: DomainContextService,
    private notificaciones: NotificacionesUiService,
    private confirmUi: ConfirmacionUiService,
    private router: Router
  ) {}

  /** Registra la devolución de una asignación activa (artículo o agrupador). */
  devolver(asig: any): void {
    const esAgrupador = asig.agrupadorId != null;
    const nombre = esAgrupador
      ? asig.agrupador?.nombre || 'el agrupador'
      : asig.articulo?.alias || asig.articulo?.nroSerie || 'el artículo';
    const empleado = asig.empleado?.nombre || 'el empleado';

    this.confirmUi.confirmar(
      `¿Registrar la devolución de "${nombre}" por ${empleado}?`,
      () => {
        const req = esAgrupador
          ? this.asignacionesService.devolverAsignacionAgrupador(asig.id)
          : this.asignacionesService.devolverAsignacionArticulo(asig.id);
        req.subscribe({
          next: () => {
            this.notificaciones.exito(`Devolución de "${nombre}" registrada.`);
            this.loadAll();
          },
          error: (e) => this.notificaciones.errorHttp(e, 'No se pudo registrar la devolución.'),
        });
      },
      { header: 'Registrar devolución', acceptLabel: 'Devolver' },
    );
  }

  ngOnInit() {
    if (!this.domainContext.domainId) {
      this.router.navigate(['/']);
      return;
    }
    this.loadAll();
  }

  loadAll() {
    const dominioId = this.domainContext.domainId;
    
    this.asignacionesService.getAsignaciones(dominioId || undefined).subscribe(res => {
      if(res.success) this.asignaciones = res.data;
    });
    this.empleadosService.getEmpleados().subscribe(res => {
      if(res.success) {
        this.empleados = res.data.map((e: any) => ({
          ...e,
          displayLabel: `[${e.legajo || 'Sin Legajo'}] - ${e.nombre} - ${e.area?.nombre || 'Sin Área'}`
        }));
      }
    });
    if (dominioId) {
      this.catalogosService.getTiposAgrupador(dominioId).subscribe(res => {
        if(res.success) {
          this.tiposAgrupador = res.data.filter((t: any) => t.asignable === true);
        }
      });
      this.catalogosService.getCategorias(dominioId).subscribe(res => {
        if (res.success) this.categorias = res.data;
      });
      this.catalogosService.getModelos(undefined, dominioId).subscribe(res => {
        if (res.success) {
          this.modelos = res.data.map((m: any) => ({
            ...m,
            displayLabel: m.marca?.nombre ? `${m.nombre} - ${m.marca.nombre}` : m.nombre
          }));
        }
      });
    }
    this.inventarioService.getArticulos(dominioId || undefined, 'Disponible').subscribe(res => {
      if(res.success) this.articulosDisponibles = res.data.map(art => ({
        ...art,
        displayLabel: `${art.alias || 'Sin Alias'} - ${art.modelo?.nombre || 'Sin Modelo'} - ${art.modelo?.marca?.nombre || 'Sin Marca'} (S/N: ${art.nroSerie || 'Sin Serie'})`
      }));
    });
    this.agrupadoresService.getAgrupadores(dominioId || undefined).subscribe(res => {
      if(res.success) {
        this.agrupadoresDisponibles = res.data
          .filter((a: any) => a.estado === 'DISPONIBLE' && a.tipoAgrupador?.asignable === true)
          .map((a: any) => ({
            ...a,
            displayLabel: a.tipoAgrupador?.nombre ? `${a.tipoAgrupador.nombre} - ${a.nombre}` : a.nombre
          }));
      }
    });
    this.inventarioService.getLotes(dominioId || undefined).subscribe(res => {
      if(res.success) {
        this.lotesDisponibles = res.data
          .filter(l => l.cantidadDisponible > 0)
          .map(l => ({
            ...l,
            displayLabel: `Lote #${l.id} (Disponible: ${l.cantidadDisponible} u.) - Creado: ${l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Sin fecha'}`
          }));
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

  abrirDialogo() {
    this.newAsignacion = { empleadoId: null, itemId: null, observaciones: '', cantidad: 1 };
    this.tipoAsignacion = 'ARTICULO';
    this.selectedConsumibleCategoriaId = null;
    this.selectedConsumibleModeloId = null;
    this.selectedConsumibleLoteId = null;
    this.showNuevoDialog = true;
  }

  guardarAsignacion() {
    if (!this.newAsignacion.empleadoId || !this.newAsignacion.itemId) return;

    const empleado = this.empleados.find(e => e.id === this.newAsignacion.empleadoId)?.nombre;
    const done = (mensaje: string) => () => {
      this.notificaciones.exito(empleado ? `${mensaje} a ${empleado}.` : `${mensaje}.`);
      this.showNuevoDialog = false;
      this.loadAll();
    };
    const onErr = (e: unknown) => this.notificaciones.errorHttp(e, 'No se pudo realizar la asignación.');

    if (this.tipoAsignacion === 'ARTICULO') {
      this.asignacionesService.createAsignacion({
        empleadoId: this.newAsignacion.empleadoId,
        articuloId: this.newAsignacion.itemId,
        observaciones: this.newAsignacion.observaciones
      }).subscribe({ next: done('Artículo asignado'), error: onErr });
    } else if (this.tipoAsignacion === 'AGRUPADOR') {
      this.asignacionesService.createAsignacionAgrupador({
        empleadoId: this.newAsignacion.empleadoId,
        agrupadorId: this.newAsignacion.itemId,
        observaciones: this.newAsignacion.observaciones
      }).subscribe({ next: done('Agrupador asignado'), error: onErr });
    } else if (this.tipoAsignacion === 'CONSUMIBLE') {
      this.asignacionesService.createAsignacionConsumible({
        empleadoId: this.newAsignacion.empleadoId,
        loteId: this.newAsignacion.itemId,
        cantidad: this.newAsignacion.cantidad
      }).subscribe({ next: done(`Se entregaron ${this.newAsignacion.cantidad} unidades`), error: onErr });
    }
  }

  private getParsedAtributos(atributos: any): any {
    if (!atributos) return {};
    if (typeof atributos === 'string') {
      try {
        return JSON.parse(atributos);
      } catch {
        return {};
      }
    }
    return atributos;
  }

  private getAttributeValue(attrs: any, a: any): any {
    if (!attrs || !a) return null;
    
    // 1. Direct match on clave
    if (attrs[a.clave] != null && attrs[a.clave] !== '') return attrs[a.clave];
    
    // 2. Direct match on nombre
    if (attrs[a.nombre] != null && attrs[a.nombre] !== '') return attrs[a.nombre];
    
    // 3. Case-insensitive search on keys
    const keys = Object.keys(attrs);
    const lowerClave = a.clave.toLowerCase();
    const lowerNombre = a.nombre.toLowerCase();
    
    for (const k of keys) {
      const lowerK = k.toLowerCase();
      if (lowerK === lowerClave || lowerK === lowerNombre) {
        if (attrs[k] != null && attrs[k] !== '') {
          return attrs[k];
        }
      }
    }
    
    return null;
  }

  getModelSpecsList(modelo: any): { nombre: string, valor: string }[] {
    if (!modelo?.atributos || !modelo?.categoriaId) return [];
    const cat = this.categorias.find(c => c.id === modelo.categoriaId);
    if (!cat?.atributos) return [];
    
    const attrs = this.getParsedAtributos(modelo.atributos);
    return cat.atributos
      .map((a: any) => {
        const val = this.getAttributeValue(attrs, a);
        return {
          attr: a,
          val: val
        };
      })
      .filter((item: any) => item.val != null)
      .map((item: any) => {
        let val = item.val;
        if (item.attr.tipoDato === 'BOOLEANO') {
          val = (val === true || val === 1 || val === '1' || val === 'true') ? 'SI' : 'NO';
        }
        return {
          nombre: item.attr.nombre,
          valor: String(val)
        };
      });
  }

  getModelTooltipHtml(modelo: any): string {
    const list = this.getModelSpecsList(modelo);
    if (list.length === 0) return '';
    
    let html = '<div style="font-weight: 700; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid var(--border-soft); padding-bottom: 0.25rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-family: inherit;">Especificaciones del Modelo</div>';
    for (const spec of list) {
      html += `<div style="display: flex; justify-content: space-between; gap: 1.5rem; font-size: 12.5px; margin-bottom: 0.25rem; font-family: inherit; line-height: 1.4;">
        <span style="font-weight: 600; opacity: 0.85; margin-right: 1.5rem; white-space: nowrap;">${spec.nombre}:</span>
        <span style="font-weight: 500; text-align: right; word-break: break-word;">${spec.valor}</span>
      </div>`;
    }
    return html;
  }
}
