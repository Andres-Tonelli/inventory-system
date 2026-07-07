import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AuthService } from './core/auth/auth.service';
import { DomainContextService } from './core/domain-context.service';
import { CatalogosService, Dominio } from './core/services/catalogos.service';

@Component({
  imports: [RouterModule, CommonModule, ButtonModule, ConfirmDialogModule, ToastModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'frontend';
  dominios: Dominio[] = [];

  constructor(
    private authService: AuthService,
    private domainContext: DomainContextService,
    private catalogosService: CatalogosService,
    private router: Router
  ) {}

  ngOnInit() {
    // Cargar los dominios disponibles para mapear nombres en el Sidebar
    this.catalogosService.getDominios().subscribe(res => {
      if (res.success) {
        this.dominios = res.data;
      }
    });
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  getUsername(): string {
    return this.authService.currentUser()?.nombre || 'Empleado';
  }

  getLegajo(): string {
    return this.authService.currentUser()?.legajo || '';
  }

  onLogout() {
    this.authService.logout();
    this.domainContext.clearDomain();
    this.router.navigate(['/login']);
  }

  hasSelectedDomain(): boolean {
    return this.domainContext.currentDomainId() !== null;
  }

  getSelectedDomainId(): number | null {
    return this.domainContext.currentDomainId();
  }

  getSelectedDomainName(): string {
    const id = this.domainContext.currentDomainId();
    if (!id) return '';
    const dom = this.dominios.find(d => d.id === id);
    return dom ? dom.nombre : `Dominio ${id}`;
  }

  isRouteActive(route: string): boolean {
    return this.router.url === route;
  }

  isCatalogosActive(): boolean {
    return this.router.url.startsWith('/catalogos');
  }

  isConfiguracionActive(): boolean {
    return this.router.url.startsWith('/configuracion/dominios');
  }

  isOrganizacionActive(): boolean {
    return this.router.url.startsWith('/configuracion/organizacion');
  }

  isAsignacionesActive(): boolean {
    return this.router.url.startsWith('/asignaciones');
  }

  isDomainActive(): boolean {
    return this.router.url.startsWith('/dominios/');
  }
}
