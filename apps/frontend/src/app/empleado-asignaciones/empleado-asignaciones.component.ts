import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { AsignacionesService } from '../core/services/asignaciones.service';
import { EmpleadosService } from '../core/services/empleados.service';
import { CatalogosService } from '../core/services/catalogos.service';
import { ChecklistsService } from '../core/services/checklists.service';
import { Checklist } from '@inventory-system/api-contract';
import { PaginadorComponent, paginar } from '../core/ui/paginador.component';
import { NotificacionesUiService } from '../core/notificaciones-ui.service';

@Component({
  selector: 'app-empleado-asignaciones',
  standalone: true,
  imports: [CommonModule, PaginadorComponent, DialogModule, TooltipModule, FormsModule, ToggleSwitchModule, InputTextModule, SelectModule],
  templateUrl: './empleado-asignaciones.component.html',
  styleUrl: './empleado-asignaciones.component.scss',
})
export class EmpleadoAsignacionesComponent implements OnInit {
  empleadoId!: number;
  empleado: any = null;
  agrupadores: any[] = [];
  articulos: any[] = [];
  historial: any[] = [];
  loading = true;

  // Checklists State
  loadingDetailsChecklists = false;
  articuloChecklists: Checklist[] = [];
  agrupadorChecklists: Checklist[] = [];

  // Checklist Instantiation & History State
  showInstanciasDialog = false;
  instanciasArticuloUAgrupador: any[] = [];
  selectedArticuloChecklist: any = null;
  selectedAgrupadorChecklist: any = null;
  loadingInstancias = false;

  checklistsDisponibles: any[] = [];
  selectedChecklistTemplate: any = null;
  showNuevaInstanciaForm = false;

  nuevaInstancia = {
    checklistId: null as number | null,
    observaciones: '',
    responsable: '',
    valores: [] as { checklistItemId: number; pregunta: string; valor: boolean; observacion: string }[]
  };

  selectedInstanciaDetalle: any = null;
  showDetalleInstanciaDialog = false;

  showDetalleArticuloDialog = false;
  selectedArticuloDetalle: any = null;
  showDetalleAgrupadorDialog = false;
  selectedAgrupadorDetalle: any = null;

  // Variables de paginación
  paginaAgrupadores = 1;
  paginaArticulos = 1;
  paginaHistorial = 1;

  get paginatedAgrupadores(): any[] {
    return paginar(this.agrupadores, this.paginaAgrupadores);
  }

  get paginatedArticulos(): any[] {
    return paginar(this.articulos, this.paginaArticulos);
  }

  get paginatedHistorial(): any[] {
    return paginar(this.historial, this.paginaHistorial);
  }

  categorias: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private asignacionesService: AsignacionesService,
    private empleadosService: EmpleadosService,
    private catalogosService: CatalogosService,
    private checklistsService: ChecklistsService,
    private notificaciones: NotificacionesUiService,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) return;
      this.empleadoId = Number(id);
      this.load();
    });
  }

  private load() {
    this.loading = true;
    this.catalogosService.getCategorias().subscribe((res) => {
      if (res.success) this.categorias = res.data;
    });
    this.empleadosService.getEmpleados().subscribe((res) => {
      if (res.success) this.empleado = res.data.find((e: any) => e.id === this.empleadoId) ?? null;
    });
    this.asignacionesService.getAsignacionesDeEmpleado(this.empleadoId).subscribe({
      next: (res) => {
        if (res.success) {
          this.agrupadores = res.data.agrupadores ?? [];
          this.articulos = res.data.articulos ?? [];
          this.historial = res.data.historial ?? [];
        }
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get totalArticulosEnConjuntos(): number {
    return this.agrupadores.reduce((acc, ag) => acc + (ag.articulos?.length ?? 0), 0);
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

  expandedAgrupadores: Record<number, boolean> = {};

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
    
    // Check if attribute is boolean
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
    this.articuloChecklists = [];
    this.loadingDetailsChecklists = true;
    this.showDetalleArticuloDialog = true;

    const domId = art.modelo?.categoria?.dominioId;
    if (domId) {
      this.checklistsService.getChecklists({ dominioId: domId }).subscribe({
        next: (res) => {
          if (res.success) {
            const catId = art.modelo?.categoriaId;
            this.articuloChecklists = res.data.filter(
              (c) => c.ambito === 'ARTICULO' && (c.categoriaId === catId || !c.categoriaId)
            );
          }
          this.loadingDetailsChecklists = false;
        },
        error: () => {
          this.loadingDetailsChecklists = false;
        }
      });
    } else {
      this.loadingDetailsChecklists = false;
    }
  }

  verDetalleAgrupador(sub: any) {
    this.selectedAgrupadorDetalle = sub;
    this.agrupadorChecklists = [];
    this.loadingDetailsChecklists = true;
    this.showDetalleAgrupadorDialog = true;

    const domId = sub.tipoAgrupador?.dominioId;
    if (domId) {
      this.checklistsService.getChecklists({ dominioId: domId }).subscribe({
        next: (res) => {
          if (res.success) {
            const tipoId = sub.tipoAgrupadorId;
            this.agrupadorChecklists = res.data.filter(
              (c) => c.ambito === 'AGRUPADOR' && (c.tipoAgrupadorId === tipoId || !c.tipoAgrupadorId)
            );
          }
          this.loadingDetailsChecklists = false;
        },
        error: () => {
          this.loadingDetailsChecklists = false;
        }
      });
    } else {
      this.loadingDetailsChecklists = false;
    }
  }

  volver() {
    this.router.navigate(['/configuracion/organizacion']);
  }

  // --- INSTANCIACIÓN E HISTORIAL DE CHECKLISTS ---

  abrirHistorialChecklistArticulo(art: any) {
    this.selectedArticuloChecklist = art;
    this.selectedAgrupadorChecklist = null;
    this.showNuevaInstanciaForm = false;
    this.selectedChecklistTemplate = null;
    this.nuevaInstancia = {
      checklistId: null,
      observaciones: '',
      responsable: this.empleado?.nombre || '',
      valores: []
    };

    this.loadingInstancias = true;
    this.showInstanciasDialog = true;

    this.checklistsService.getChecklistInstancias({ articuloId: art.id }).subscribe({
      next: (res) => {
        if (res.success) {
          this.instanciasArticuloUAgrupador = res.data;
        }
        this.loadingInstancias = false;
      },
      error: () => {
        this.loadingInstancias = false;
      }
    });

    const domId = art.modelo?.categoria?.dominioId;
    if (domId) {
      this.checklistsService.getChecklists({ dominioId: domId, ambito: 'ARTICULO' }).subscribe({
        next: (res) => {
          if (res.success) {
            const catId = art.modelo?.categoriaId;
            this.checklistsDisponibles = res.data.filter(c => c.categoriaId === catId || !c.categoriaId);
          }
        }
      });
    }
  }

  abrirHistorialChecklistAgrupador(ag: any) {
    this.selectedAgrupadorChecklist = ag;
    this.selectedArticuloChecklist = null;
    this.showNuevaInstanciaForm = false;
    this.selectedChecklistTemplate = null;
    this.nuevaInstancia = {
      checklistId: null,
      observaciones: '',
      responsable: this.empleado?.nombre || '',
      valores: []
    };

    this.loadingInstancias = true;
    this.showInstanciasDialog = true;

    this.checklistsService.getChecklistInstancias({ agrupadorId: ag.id }).subscribe({
      next: (res) => {
        if (res.success) {
          this.instanciasArticuloUAgrupador = res.data;
        }
        this.loadingInstancias = false;
      },
      error: () => {
        this.loadingInstancias = false;
      }
    });

    const domId = ag.tipoAgrupador?.dominioId;
    if (domId) {
      this.checklistsService.getChecklists({ dominioId: domId, ambito: 'AGRUPADOR' }).subscribe({
        next: (res) => {
          if (res.success) {
            const tipoId = ag.tipoAgrupadorId;
            this.checklistsDisponibles = res.data.filter(c => c.tipoAgrupadorId === tipoId || !c.tipoAgrupadorId);
          }
        }
      });
    }
  }

  iniciarNuevaInstancia() {
    this.showNuevaInstanciaForm = true;
    this.selectedChecklistTemplate = null;
    this.nuevaInstancia.checklistId = null;
    this.nuevaInstancia.observaciones = '';
    this.nuevaInstancia.responsable = this.empleado?.nombre || '';
    this.nuevaInstancia.valores = [];
  }

  onTemplateSelected(ch: any) {
    if (!ch) {
      this.selectedChecklistTemplate = null;
      this.nuevaInstancia.checklistId = null;
      this.nuevaInstancia.valores = [];
      return;
    }
    this.selectedChecklistTemplate = ch;
    this.nuevaInstancia.checklistId = ch.id;
    this.nuevaInstancia.valores = (ch.items || []).map((item: any) => ({
      checklistItemId: item.id,
      pregunta: item.pregunta,
      valor: false,
      observacion: ''
    }));
  }

  guardarNuevaInstancia() {
    if (!this.nuevaInstancia.checklistId) {
      this.notificaciones.error('Debe seleccionar una plantilla de checklist.');
      return;
    }
    if (!this.nuevaInstancia.responsable.trim()) {
      this.notificaciones.error('El nombre del responsable de la inspección es requerido.');
      return;
    }

    const payload = {
      checklistId: this.nuevaInstancia.checklistId,
      articuloId: this.selectedArticuloChecklist?.id || null,
      agrupadorId: this.selectedAgrupadorChecklist?.id || null,
      observaciones: this.nuevaInstancia.observaciones,
      responsable: this.nuevaInstancia.responsable,
      valores: this.nuevaInstancia.valores.map(v => ({
        checklistItemId: v.checklistItemId,
        valor: v.valor,
        observacion: v.observacion
      }))
    };

    this.checklistsService.crearChecklistInstancia(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.notificaciones.exito('Inspección de checklist registrada con éxito.');
          this.showNuevaInstanciaForm = false;
          
          const art = this.selectedArticuloChecklist;
          const ag = this.selectedAgrupadorChecklist;
          if (art) this.abrirHistorialChecklistArticulo(art);
          else if (ag) this.abrirHistorialChecklistAgrupador(ag);
        }
      },
      error: (err) => this.notificaciones.errorHttp(err, 'No se pudo registrar la inspección.')
    });
  }

  verDetalleInstancia(inst: any) {
    this.checklistsService.getChecklistInstanciaById(inst.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.selectedInstanciaDetalle = res.data;
          this.showDetalleInstanciaDialog = true;
        }
      },
      error: (err) => this.notificaciones.errorHttp(err, 'No se pudo obtener el detalle del control.')
    });
  }
}
