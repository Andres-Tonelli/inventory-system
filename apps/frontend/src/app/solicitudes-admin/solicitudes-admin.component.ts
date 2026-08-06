import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

import { SolicitudesService } from '../core/services/solicitudes.service';
import { CatalogosService, Dominio, EstadoArticulo } from '../core/services/catalogos.service';
import { NotificacionesUiService } from '../core/notificaciones-ui.service';
import { AuthService } from '../core/auth/auth.service';
import { PaginadorComponent, paginar } from '../core/ui/paginador.component';

@Component({
  selector: 'app-solicitudes-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginadorComponent, DialogModule, TooltipModule, SelectModule, InputTextModule],
  templateUrl: './solicitudes-admin.component.html',
  styleUrl: './solicitudes-admin.component.scss',
})
export class SolicitudesAdminComponent implements OnInit {
  loading = true;
  solicitudes: any[] = [];
  dominios: Dominio[] = [];
  
  // Filters
  selectedDomainId: number | null = null;
  selectedEstado: string = 'PENDIENTE'; // PENDIENTE, EN_CURSO, CERRADAS
  pagina = 1;

  // Resolution Dialogs
  showResolverDialog = false;
  selectedSolicitud: any = null;
  nuevoEstado: 'APROBADA' | 'RECHAZADA' | 'ENTREGADA' = 'APROBADA';
  resolverInmediatamente = false;
  observacionesAdmin = '';
  nuevoEstadoArticuloCodigo = '';
  estadosDisponibles: EstadoArticulo[] = [];
  submitting = false;

  constructor(
    private solicitudesService: SolicitudesService,
    private catalogosService: CatalogosService,
    private notificaciones: NotificacionesUiService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.catalogosService.getDominios().subscribe({
      next: (res) => {
        if (res.success) {
          this.dominios = res.data ?? [];
          
          // Filter dominios if the user is a DOMINIO administrator
          const user = this.authService.currentUser();
          if (user && user.rol === 'DOMINIO' && user.dominios?.length > 0) {
            this.dominios = this.dominios.filter(d => user.dominios.includes(d.id!));
            if (this.dominios.length > 0) {
              this.selectedDomainId = this.dominios[0].id!;
            }
          } else {
            // System admins get the option to view all domains at once
            this.dominios = [{ id: null as any, nombre: 'Todos los dominios' }, ...this.dominios];
          }
          this.fetchSolicitudes();
        } else {
          this.loading = false;
        }
      },
      error: () => (this.loading = false),
    });
  }

  fetchSolicitudes() {
    this.loading = true;
    const domFilter = this.selectedDomainId || undefined;
    this.solicitudesService.getSolicitudes(domFilter).subscribe({
      next: (res) => {
        if (res.success) {
          this.solicitudes = res.data ?? [];
        }
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get filteredSolicitudes(): any[] {
    let list = this.solicitudes;

    // Filter by status
    if (this.selectedEstado === 'PENDIENTE') {
      list = list.filter(s => s.estado === 'PENDIENTE');
    } else if (this.selectedEstado === 'EN_CURSO') {
      list = list.filter(s => s.estado === 'APROBADA');
    } else if (this.selectedEstado === 'CERRADAS') {
      list = list.filter(s => s.estado === 'ENTREGADA' || s.estado === 'RECHAZADA');
    }

    return list;
  }

  get paginatedSolicitudes(): any[] {
    return paginar(this.filteredSolicitudes, this.pagina);
  }

  get totalPending(): number {
    return this.solicitudes.filter(s => s.estado === 'PENDIENTE').length;
  }

  get totalEnCurso(): number {
    return this.solicitudes.filter(s => s.estado === 'APROBADA').length;
  }

  get totalClosed(): number {
    return this.solicitudes.filter(s => s.estado === 'ENTREGADA' || s.estado === 'RECHAZADA').length;
  }

  onFilterChange() {
    this.pagina = 1;
    this.fetchSolicitudes();
  }

  abrirResolver(s: any, nuevoEstado: 'APROBADA' | 'RECHAZADA' | 'ENTREGADA') {
    this.selectedSolicitud = s;
    this.nuevoEstado = nuevoEstado;
    this.observacionesAdmin = '';
    this.nuevoEstadoArticuloCodigo = '';
    this.estadosDisponibles = [];
    this.resolverInmediatamente = false;
    this.showResolverDialog = true;

    if ((nuevoEstado === 'APROBADA' || nuevoEstado === 'ENTREGADA') && s.tipo === 'ROTURA' && s.articuloId) {
      this.catalogosService.getEstados(s.dominioId).subscribe(res => {
        if (res.success) {
          this.estadosDisponibles = res.data ?? [];
          // Pre-select a broken/repair state if exists
          const repairState = this.estadosDisponibles.find(e => 
            e.codigo?.toLowerCase().includes('repar') || 
            e.nombre.toLowerCase().includes('repar') ||
            e.codigo?.toLowerCase().includes('roto') ||
            e.codigo?.toLowerCase().includes('baja')
          );
          if (repairState && repairState.codigo) {
            this.nuevoEstadoArticuloCodigo = repairState.codigo;
          } else if (this.estadosDisponibles.length > 0 && this.estadosDisponibles[0].codigo) {
            this.nuevoEstadoArticuloCodigo = this.estadosDisponibles[0].codigo;
          }
        }
      });
    }
  }

  guardarResolucion() {
    if (this.nuevoEstado === 'RECHAZADA' && !this.observacionesAdmin.trim()) {
      this.notificaciones.advertencia('Por favor ingresa un motivo para el rechazo.');
      return;
    }

    this.submitting = true;
    
    // Determine the actual state to send
    let targetEstado = this.nuevoEstado;
    if (this.nuevoEstado === 'APROBADA' && this.resolverInmediatamente) {
      targetEstado = 'ENTREGADA';
    }

    this.solicitudesService.resolverSolicitud(this.selectedSolicitud.id, {
      estado: targetEstado,
      observacionesAdmin: this.observacionesAdmin,
      nuevoEstadoArticuloCodigo: (targetEstado === 'APROBADA' || targetEstado === 'ENTREGADA') ? this.nuevoEstadoArticuloCodigo || undefined : undefined
    }).subscribe({
      next: () => {
        this.notificaciones.exito('Solicitud procesada con éxito');
        this.showResolverDialog = false;
        this.submitting = false;
        this.fetchSolicitudes();
      },
      error: (err) => {
        this.notificaciones.errorHttp(err, 'No se pudo resolver la solicitud');
        this.submitting = false;
      }
    });
  }

  getDominioNombre(dominioId: number): string {
    const d = this.dominios.find(x => x.id === dominioId);
    return d ? d.nombre : `Dominio #${dominioId}`;
  }

  isSystemAdmin(): boolean {
    return this.authService.isSystemAdmin();
  }
}
