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

  volver() {
    this.router.navigate(['/configuracion/organizacion']);
  }
}
