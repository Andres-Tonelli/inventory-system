import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AsignacionesService } from '../core/services/asignaciones.service';
import { EmpleadosService } from '../core/services/empleados.service';
import { PaginadorComponent, paginar } from '../core/ui/paginador.component';

@Component({
  selector: 'app-empleado-asignaciones',
  standalone: true,
  imports: [CommonModule, PaginadorComponent],
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private asignacionesService: AsignacionesService,
    private empleadosService: EmpleadosService,
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

  volver() {
    this.router.navigate(['/configuracion/organizacion']);
  }
}
