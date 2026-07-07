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

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, DialogModule, SelectModule, InputTextModule
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

  showNuevoDialog = false;
  activeTab: 'articulos' | 'agrupadores' | 'consumibles' = 'articulos';
  tipoAsignacion: 'ARTICULO' | 'AGRUPADOR' | 'CONSUMIBLE' = 'ARTICULO';

  // Conjuntos: hay que elegir un tipo de conjunto antes de listar.
  tiposAgrupador: TipoAgrupador[] = [];
  selectedTipoConjunto: number | null = null;

  newAsignacion = {
    empleadoId: null as number | null,
    itemId: null as number | null,
    observaciones: '',
    cantidad: 1
  };

  get totalAsignaciones(): number {
    return this.asignaciones.length;
  }

  get totalArticulos(): number {
    return this.asignaciones.filter(a => a.articuloId).length;
  }

  get totalAgrupadores(): number {
    return this.asignaciones.filter(a => a.agrupadorId).length;
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

  get filteredAsignacionesArticulos(): any[] {
    const list = this.asignacionesArticulos;
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
    const list = this.asignacionesAgrupadores.filter(
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

  constructor(
    private asignacionesService: AsignacionesService,
    private empleadosService: EmpleadosService,
    private inventarioService: InventarioService,
    private agrupadoresService: AgrupadoresService,
    private catalogosService: CatalogosService,
    private domainContext: DomainContextService,
    private notificaciones: NotificacionesUiService,
    private router: Router
  ) {}

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
      if(res.success) this.empleados = res.data;
    });
    if (dominioId) {
      this.catalogosService.getTiposAgrupador(dominioId).subscribe(res => {
        if(res.success) this.tiposAgrupador = res.data;
      });
    }
    this.inventarioService.getArticulos(dominioId || undefined, 'Disponible').subscribe(res => {
      if(res.success) this.articulosDisponibles = res.data.map(art => ({
        ...art,
        displayLabel: art.alias 
          ? `[Alias: ${art.alias}] - [S/N: ${art.nroSerie || 'Sin Serie'}] - ${art.modelo?.nombre || 'Sin modelo'}`
          : `[S/N: ${art.nroSerie || 'Sin Serie'}] - ${art.modelo?.nombre || 'Sin modelo'}`
      }));
    });
    this.agrupadoresService.getAgrupadores(dominioId || undefined).subscribe(res => {
      if(res.success) {
        this.agrupadoresDisponibles = res.data
          .filter((a: any) => a.estado === 'DISPONIBLE')
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
            displayLabel: `${l.modelo?.nombre || 'Sin modelo'} (Disponible: ${l.cantidadDisponible})`
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
}
