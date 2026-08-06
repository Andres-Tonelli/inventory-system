import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { CatalogosService, Dominio } from '../core/services/catalogos.service';
import { InventarioService } from '../core/services/inventario.service';
import { AgrupadoresService } from '../core/services/agrupadores.service';
import { AsignacionesService } from '../core/services/asignaciones.service';
import { AuthService } from '../core/auth/auth.service';
import { DomainContextService } from '../core/domain-context.service';

interface DomainStats {
  articulos: number;
  agrupadores: number;
  asignaciones: number;
  consumiblesSinStock: number;
}

@Component({
  selector: 'app-domain-selection',
  standalone: true,
  imports: [CommonModule, RouterModule, ProgressSpinnerModule],
  templateUrl: './domain-selection.component.html',
  styleUrl: './domain-selection.component.scss'
})
export class DomainSelectionComponent implements OnInit {
  dominios: Dominio[] = [];
  stats: Record<number, DomainStats> = {};
  loading = true;
  loadingStats = true;

  constructor(
    private catalogosService: CatalogosService,
    private inventarioService: InventarioService,
    private agrupadoresService: AgrupadoresService,
    private asignacionesService: AsignacionesService,
    private authService: AuthService,
    private domainContext: DomainContextService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user && user.rol === 'COLABORADOR') {
      this.router.navigate(['/mis-asignaciones']);
      return;
    }
    this.domainContext.clearDomain();
    this.catalogosService.getDominios().subscribe({
      next: (res) => {
        const allDomains = res.success ? res.data : [];
        const user = this.authService.currentUser();
        if (user && user.rol !== 'SISTEMA') {
          this.dominios = allDomains.filter(d => d.id && user.dominios.includes(d.id));
        } else {
          this.dominios = allDomains;
        }
        this.loading = false;
        this.loadStats();
      },
      error: () => {
        this.loading = false;
        this.loadingStats = false;
      }
    });
  }

  isSystemAdmin(): boolean {
    return this.authService.isSystemAdmin();
  }

  private loadStats() {
    if (this.dominios.length === 0) {
      this.loadingStats = false;
      return;
    }
    const calls = this.dominios.map((d) =>
      forkJoin({
        articulos: this.inventarioService.getArticulos(d.id),
        agrupadores: this.agrupadoresService.getAgrupadores(d.id),
        asignaciones: this.asignacionesService.getAsignaciones(d.id),
        lotes: this.inventarioService.getLotes(d.id)
      })
    );
    forkJoin(calls).subscribe({
      next: (results) => {
        results.forEach((r, i) => {
          const id = this.dominios[i].id!;
          this.stats[id] = {
            articulos: r.articulos.success ? r.articulos.data.length : 0,
            agrupadores: r.agrupadores.success ? r.agrupadores.data.length : 0,
            asignaciones: r.asignaciones.success ? r.asignaciones.data.length : 0,
            consumiblesSinStock: r.lotes.success
              ? r.lotes.data.filter((l: any) => (l.cantidadDisponible ?? 0) <= 0).length
              : 0
          };
        });
        this.loadingStats = false;
      },
      error: () => (this.loadingStats = false)
    });
  }

  statsOf(id?: number): DomainStats {
    return (id != null && this.stats[id]) || { articulos: 0, agrupadores: 0, asignaciones: 0, consumiblesSinStock: 0 };
  }

  get totalArticulos(): number {
    return Object.values(this.stats).reduce((a, s) => a + s.articulos, 0);
  }
  get totalAgrupadores(): number {
    return Object.values(this.stats).reduce((a, s) => a + s.agrupadores, 0);
  }
  get totalAsignaciones(): number {
    return Object.values(this.stats).reduce((a, s) => a + s.asignaciones, 0);
  }
  get totalAlertas(): number {
    return Object.values(this.stats).reduce((a, s) => a + s.consumiblesSinStock, 0);
  }

  /** Icono configurado por el admin (ADR-0008); cae a 'box' si el dominio no tiene. */
  domainIcon(d: Dominio): string {
    return 'pi pi-' + (d.icono || 'box');
  }

  /** Color de acento configurado por el admin (ADR-0008); cae a 'indigo'. */
  domainTone(d: Dominio): string {
    return d.color || 'indigo';
  }

  getUsername(): string {
    return this.authService.currentUser()?.nombre || 'Bienvenido';
  }

  selectDomain(dominio: Dominio) {
    this.router.navigate(['/dominios', dominio.id]);
  }
}
