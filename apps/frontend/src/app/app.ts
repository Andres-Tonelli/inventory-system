import { Component, OnInit, effect, HostListener } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
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
  isSidebarOpen: boolean = false;
  isUserMenuOpen: boolean = false;

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  getUsernameInitials(): string {
    const name = this.getUsername();
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  @HostListener('document:click')
  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  constructor(
    private authService: AuthService,
    private domainContext: DomainContextService,
    private catalogosService: CatalogosService,
    private router: Router
  ) {
    // Escuchar el estado de autenticación. Si el usuario se loguea y no tenemos
    // cargados los dominios, los cargamos para que se mapeen bien en el Sidebar.
    effect(() => {
      const user = this.authService.currentUser();
      if (user && this.dominios.length === 0) {
        this.cargarDominios();
      }
    });
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeSidebar();
    });
  }

  cargarDominios() {
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
    return this.authService.currentUser()?.username || '';
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isSystemAdmin(): boolean {
    return this.authService.isSystemAdmin();
  }

  onLogout() {
    this.authService.logout();
    this.domainContext.clearDomain();
    this.dominios = []; // Limpiar dominios al cerrar sesión para el próximo login
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

  isAdministradoresActive(): boolean {
    return this.router.url.startsWith('/configuracion/administradores');
  }

  isDomainActive(): boolean {
    return this.router.url.startsWith('/dominios/');
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }
}
