import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

import { AsignacionesService } from '../core/services/asignaciones.service';
import { CatalogosService, Dominio } from '../core/services/catalogos.service';
import { AuthService } from '../core/auth/auth.service';
import { SolicitudesService } from '../core/services/solicitudes.service';
import { NotificacionesUiService } from '../core/notificaciones-ui.service';
import { PaginadorComponent, paginar } from '../core/ui/paginador.component';

@Component({
  selector: 'app-mis-asignaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginadorComponent, DialogModule, TooltipModule, SelectModule, InputTextModule],
  templateUrl: './mis-asignaciones.component.html',
  styleUrl: './mis-asignaciones.component.scss',
})
export class MisAsignacionesComponent implements OnInit {
  empleadoId: number | null = null;
  nombreEmpleado = '';
  legajoEmpleado = '';
  loading = true;

  dominios: Dominio[] = [];
  selectedDomainId: number | null = null;

  // Raw data from API
  allAgrupadores: any[] = [];
  allArticulos: any[] = [];
  globalHistorial: any[] = [];
  categorias: any[] = [];

  // Paged arrays for the active tab/domain
  paginaAgrupadores = 1;
  paginaArticulos = 1;
  paginaHistorial = 1;

  showDetalleArticuloDialog = false;
  selectedArticuloDetalle: any = null;
  showDetalleAgrupadorDialog = false;
  selectedAgrupadorDetalle: any = null;

  expandedAgrupadores: Record<number, boolean> = {};

  // Solicitudes state
  solicitudes: any[] = [];
  paginaSolicitudes = 1;
  paginaSolicitudesGenerales = 1;

  // Modal controls
  showRoturaModal = false;
  showInsumoModal = false;
  showPrestamoModal = false;
  showGeneralModal = false;
  solicitudSubmitting = false;
  showHistorialDetails = false;
  showSolicitudesDetails = true;
  showGeneralDetails = true;

  toggleHistorial() {
    this.showHistorialDetails = !this.showHistorialDetails;
  }

  toggleSolicitudes() {
    this.showSolicitudesDetails = !this.showSolicitudesDetails;
  }

  toggleGeneral() {
    this.showGeneralDetails = !this.showGeneralDetails;
  }

  // Form fields
  motivoSolicitud = '';
  selectedArticuloId: number | null = null;
  selectedCategoriaId: number | null = null;
  cantidadSolicitud = 1;
  fechaInicioSolicitud = '';
  fechaFinSolicitud = '';
  tituloSolicitud = '';
  motivoSolicitudGeneral = '';

  constructor(
    private authService: AuthService,
    private asignacionesService: AsignacionesService,
    private catalogosService: CatalogosService,
    private solicitudesService: SolicitudesService,
    private notificaciones: NotificacionesUiService,
  ) {}

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user && user.empleadoId) {
      this.empleadoId = user.empleadoId;
      this.nombreEmpleado = user.nombre;
      this.legajoEmpleado = user.username;
      this.load();
    } else {
      this.loading = false;
    }
  }

  private load() {
    if (!this.empleadoId) return;
    this.loading = true;

    this.catalogosService.getCategorias().subscribe((res) => {
      if (res.success) this.categorias = res.data;
    });

    this.catalogosService.getDominios().subscribe((res) => {
      if (res.success) {
        this.dominios = res.data;
        if (this.dominios.length > 0) {
          this.selectedDomainId = this.dominios[0].id ?? null;
        }
        this.fetchAssignments();
      } else {
        this.loading = false;
      }
    });
  }

  private fetchAssignments() {
    if (!this.empleadoId) return;

    this.asignacionesService.getAsignacionesDeEmpleado(this.empleadoId).subscribe({
      next: (res) => {
        if (res.success) {
          this.allAgrupadores = res.data.agrupadores ?? [];
          this.allArticulos = res.data.articulos ?? [];
          this.globalHistorial = res.data.historial ?? [];
          
          // Auto-select first domain that has any assignments if possible
          if (this.dominios.length > 0) {
            const domainWithAssets = this.dominios.find(d => 
              this.getAgrupadoresForDomain(d.id!).length > 0 || 
              this.getArticulosForDomain(d.id!).length > 0
            );
            if (domainWithAssets) {
              this.selectedDomainId = domainWithAssets.id ?? null;
            }
          }
        }
        this.fetchSolicitudes();
      },
      error: () => (this.loading = false),
    });
  }

  fetchSolicitudes() {
    if (!this.empleadoId) return;
    this.solicitudesService.getSolicitudes(undefined, this.empleadoId).subscribe({
      next: (res) => {
        if (res.success) {
          this.solicitudes = res.data ?? [];
        }
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  // Solicitudes filtering & getters
  getSolicitudesForDomain(domainId: number): any[] {
    return this.solicitudes.filter(s => s.dominioId === domainId);
  }

  get paginatedSolicitudes(): any[] {
    if (this.selectedDomainId === null) return [];
    return paginar(this.getSolicitudesForDomain(this.selectedDomainId), this.paginaSolicitudes);
  }

  // Get active articles for reporting a rotura
  getArticulosDisponiblesParaReportar(domainId: number): any[] {
    const direct = this.getArticulosForDomain(domainId);
    const nested = this.getAgrupadoresForDomain(domainId).flatMap(ag => ag.articulos || []);
    
    // Deduplicate by ID
    const seen = new Set<number>();
    const list: any[] = [];
    for (const art of [...direct, ...nested]) {
      if (art && art.id && !seen.has(art.id)) {
        seen.add(art.id);
        const namePart = art.alias ? `${art.alias}` : (art.nroSerie ? `SN: ${art.nroSerie}` : `Artículo #${art.id}`);
        const modelPart = art.modelo?.nombre ? ` (${art.modelo.nombre})` : '';
        art.dropdownLabel = `${namePart}${modelPart}`;
        list.push(art);
      }
    }
    return list;
  }

  getCategoriasLoteForDomain(domainId: number): any[] {
    return this.categorias.filter(c => c.dominioId === domainId && c.tipoSeguimiento === 'POR_LOTE');
  }

  getCategoriasUnitarioForDomain(domainId: number): any[] {
    return this.categorias.filter(c => c.dominioId === domainId && c.tipoSeguimiento === 'UNITARIO');
  }

  // Action helpers and form submissions
  abrirModalRotura() {
    this.selectedArticuloId = null;
    this.motivoSolicitud = '';
    this.showRoturaModal = true;
  }

  enviarRotura() {
    if (!this.selectedArticuloId) {
      this.notificaciones.advertencia('Por favor selecciona el artículo dañado.');
      return;
    }
    if (!this.motivoSolicitud.trim()) {
      this.notificaciones.advertencia('Por favor describe la falla o daño del artículo.');
      return;
    }

    this.solicitudSubmitting = true;
    this.solicitudesService.crearSolicitud({
      tipo: 'ROTURA',
      dominioId: this.selectedDomainId!,
      articuloId: this.selectedArticuloId,
      motivo: this.motivoSolicitud
    }).subscribe({
      next: () => {
        this.notificaciones.exito('Reporte de rotura enviado correctamente');
        this.showRoturaModal = false;
        this.solicitudSubmitting = false;
        this.fetchAssignments(); // Refreshes assignments and solicitudes
      },
      error: (err) => {
        this.notificaciones.errorHttp(err, 'No se pudo registrar el reporte');
        this.solicitudSubmitting = false;
      }
    });
  }

  abrirModalInsumo() {
    this.selectedCategoriaId = null;
    this.cantidadSolicitud = 1;
    this.motivoSolicitud = '';
    this.showInsumoModal = true;
  }

  enviarInsumo() {
    if (!this.selectedCategoriaId) {
      this.notificaciones.advertencia('Por favor selecciona la categoría de insumo.');
      return;
    }
    if (this.cantidadSolicitud <= 0) {
      this.notificaciones.advertencia('La cantidad debe ser mayor a 0.');
      return;
    }
    if (!this.motivoSolicitud.trim()) {
      this.notificaciones.advertencia('Por favor ingresa un motivo o justificación del pedido.');
      return;
    }

    this.solicitudSubmitting = true;
    this.solicitudesService.crearSolicitud({
      tipo: 'ESCASEZ',
      dominioId: this.selectedDomainId!,
      categoriaId: this.selectedCategoriaId,
      cantidad: this.cantidadSolicitud,
      motivo: this.motivoSolicitud
    }).subscribe({
      next: () => {
        this.notificaciones.exito('Solicitud de insumos enviada');
        this.showInsumoModal = false;
        this.solicitudSubmitting = false;
        this.fetchSolicitudes();
      },
      error: (err) => {
        this.notificaciones.errorHttp(err, 'No se pudo registrar la solicitud');
        this.solicitudSubmitting = false;
      }
    });
  }

  abrirModalPrestamo() {
    this.selectedCategoriaId = null;
    this.fechaInicioSolicitud = '';
    this.fechaFinSolicitud = '';
    this.motivoSolicitud = '';
    this.showPrestamoModal = true;
  }

  enviarPrestamo() {
    if (!this.selectedCategoriaId) {
      this.notificaciones.advertencia('Por favor selecciona la categoría.');
      return;
    }
    if (!this.fechaInicioSolicitud || !this.fechaFinSolicitud) {
      this.notificaciones.advertencia('Las fechas de inicio y fin son requeridas.');
      return;
    }
    if (new Date(this.fechaInicioSolicitud) > new Date(this.fechaFinSolicitud)) {
      this.notificaciones.advertencia('La fecha de inicio no puede ser posterior a la de fin.');
      return;
    }
    if (!this.motivoSolicitud.trim()) {
      this.notificaciones.advertencia('Por favor describe el motivo del préstamo temporal.');
      return;
    }

    this.solicitudSubmitting = true;
    this.solicitudesService.crearSolicitud({
      tipo: 'TEMPORAL',
      dominioId: this.selectedDomainId!,
      categoriaId: this.selectedCategoriaId,
      fechaInicio: this.fechaInicioSolicitud,
      fechaFin: this.fechaFinSolicitud,
      motivo: this.motivoSolicitud
    }).subscribe({
      next: () => {
        this.notificaciones.exito('Solicitud de préstamo temporal enviada');
        this.showPrestamoModal = false;
        this.solicitudSubmitting = false;
        this.fetchSolicitudes();
      },
      error: (err) => {
        this.notificaciones.errorHttp(err, 'No se pudo registrar la solicitud');
        this.solicitudSubmitting = false;
      }
    });
  }

  abrirModalGeneral() {
    this.tituloSolicitud = '';
    this.motivoSolicitudGeneral = '';
    this.showGeneralModal = true;
  }

  enviarSolicitudGeneral() {
    if (!this.tituloSolicitud.trim()) {
      this.notificaciones.advertencia('Por favor ingresa un título o concepto para la solicitud.');
      return;
    }
    if (!this.motivoSolicitudGeneral.trim()) {
      this.notificaciones.advertencia('Por favor ingresa los detalles o motivo.');
      return;
    }

    this.solicitudSubmitting = true;
    this.solicitudesService.crearSolicitud({
      tipo: 'GENERAL',
      titulo: this.tituloSolicitud,
      motivo: this.motivoSolicitudGeneral
    }).subscribe({
      next: () => {
        this.notificaciones.exito('Solicitud general enviada correctamente');
        this.showGeneralModal = false;
        this.solicitudSubmitting = false;
        this.fetchSolicitudes();
      },
      error: (err) => {
        this.notificaciones.errorHttp(err, 'No se pudo registrar la solicitud');
        this.solicitudSubmitting = false;
      }
    });
  }

  getSolicitudesGenerales(): any[] {
    return this.solicitudes.filter(s => s.tipo === 'GENERAL');
  }

  get paginatedSolicitudesGenerales(): any[] {
    return paginar(this.getSolicitudesGenerales(), this.paginaSolicitudesGenerales);
  }

  // Domain filtering
  getAgrupadoresForDomain(domainId: number): any[] {
    return this.allAgrupadores.filter(ag => ag.tipoAgrupador?.dominioId === domainId);
  }

  getArticulosForDomain(domainId: number): any[] {
    return this.allArticulos.filter(art => art.modelo?.categoria?.dominioId === domainId);
  }

  getHistorialForDomain(domainId: number): any[] {
    return this.globalHistorial.filter(h => h.dominio?.id === domainId);
  }

  get totalAssetsForSelectedDomain(): number {
    if (this.selectedDomainId === null) return 0;
    const agsCount = this.getAgrupadoresForDomain(this.selectedDomainId).length;
    const artsCount = this.getArticulosForDomain(this.selectedDomainId).length;
    return agsCount + artsCount;
  }

  selectDomain(domainId: number) {
    this.selectedDomainId = domainId;
    this.paginaAgrupadores = 1;
    this.paginaArticulos = 1;
    this.paginaHistorial = 1;
  }

  // Pagination for selected domain
  get paginatedAgrupadores(): any[] {
    if (this.selectedDomainId === null) return [];
    return paginar(this.getAgrupadoresForDomain(this.selectedDomainId), this.paginaAgrupadores);
  }

  get paginatedArticulos(): any[] {
    if (this.selectedDomainId === null) return [];
    return paginar(this.getArticulosForDomain(this.selectedDomainId), this.paginaArticulos);
  }

  get paginatedHistorial(): any[] {
    if (this.selectedDomainId === null) return [];
    return paginar(this.getHistorialForDomain(this.selectedDomainId), this.paginaHistorial);
  }

  get totalArticulosEnConjuntos(): number {
    if (this.selectedDomainId === null) return 0;
    const ags = this.getAgrupadoresForDomain(this.selectedDomainId);
    return ags.reduce((acc, ag) => acc + (ag.articulos?.length ?? 0), 0);
  }

  // Helpers copied from EmpleadoAsignacionesComponent for modal specifications and rendering
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

  toggleAgrupador(id: number) {
    this.expandedAgrupadores[id] = !this.expandedAgrupadores[id];
  }

  isAgrupadorExpanded(id: number): boolean {
    return !!this.expandedAgrupadores[id];
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

  getPredefinedSubSlots(ag: any): any[] {
    if (!ag || !ag.tipoAgrupador?.subTiposRecomendados) return [];
    return ag.tipoAgrupador.subTiposRecomendados.map((sr: any) => {
      const tipoChild = sr.childTipo;
      const sub = (ag.subAgrupadores || []).find((subAg: any) => subAg.tipoAgrupadorId === tipoChild.id);
      return {
        tipoAgrupador: tipoChild,
        subAgrupador: sub || null
      };
    });
  }

  getAdditionalSubAgrupadores(ag: any): any[] {
    if (!ag) return [];
    const recTipoIds = new Set(
      (ag.tipoAgrupador?.subTiposRecomendados || []).map((sr: any) => sr.childTipo.id).filter(Boolean)
    );
    return (ag.subAgrupadores || []).filter((subAg: any) => !recTipoIds.has(subAg.tipoAgrupadorId));
  }

  getObjectKeys(obj: any): string[] {
    if (!obj) return [];
    try {
      if (typeof obj === 'string') {
        const parsed = JSON.parse(obj);
        return Object.keys(parsed);
      }
      return Object.keys(obj);
    } catch {
      return [];
    }
  }

  getParsedAttribute(modelo: any, obj: any, key: string): string {
    if (!obj) return '';
    let val: any;
    try {
      if (typeof obj === 'string') {
        const parsed = JSON.parse(obj);
        val = parsed[key];
      } else {
        val = obj[key];
      }
    } catch {
      return '';
    }
    if (val == null) return '';
    
    if (modelo?.categoriaId) {
      const cat = this.categorias.find((c: any) => c.id === modelo.categoriaId);
      if (cat?.atributos) {
        const lowerKey = key.toLowerCase();
        const def = cat.atributos.find((a: any) => a.clave.toLowerCase() === lowerKey || a.nombre.toLowerCase() === lowerKey);
        if (def && def.tipoDato === 'BOOLEANO') {
          return (val === true || val === 1 || val === '1' || val === 'true') ? 'SI' : 'NO';
        }
      }
    }
    return String(val);
  }

  getAttributeName(modelo: any, key: string): string {
    if (!modelo?.categoriaId) return key;
    const cat = this.categorias.find((c: any) => c.id === modelo.categoriaId);
    if (!cat?.atributos) return key;
    
    const lowerKey = key.toLowerCase();
    const def = cat.atributos.find((a: any) => a.clave.toLowerCase() === lowerKey || a.nombre.toLowerCase() === lowerKey);
    return def ? def.nombre : key;
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
    if (attrs[a.clave] != null && attrs[a.clave] !== '') return attrs[a.clave];
    if (attrs[a.nombre] != null && attrs[a.nombre] !== '') return attrs[a.nombre];
    
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
    const cat = this.categorias.find((c: any) => c.id === modelo.categoriaId);
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

  verDetalleArticulo(art: any) {
    this.selectedArticuloDetalle = art;
    this.showDetalleArticuloDialog = true;
  }

  verDetalleAgrupador(sub: any) {
    this.selectedAgrupadorDetalle = sub;
    this.showDetalleAgrupadorDialog = true;
  }
}
