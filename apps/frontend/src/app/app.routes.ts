import { Route } from '@angular/router';
import { authGuard, systemAdminGuard, domainGuard, guestGuard } from './core/auth/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./domain-selection/domain-selection.component').then(m => m.DomainSelectionComponent)
      },
      {
        path: 'configuracion/dominios',
        loadComponent: () => import('./configuracion-dominios/configuracion-dominios.component').then(m => m.ConfiguracionDominiosComponent)
      },
      {
        path: 'configuracion/administradores',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./configuracion-administradores/configuracion-administradores.component').then(m => m.ConfiguracionAdministradoresComponent)
      },
      {
        path: 'configuracion/organizacion',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./organizacion/organizacion.component').then(m => m.OrganizacionComponent)
      },
      {
        path: 'configuracion/organizacion/empleados/:id',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./empleado-asignaciones/empleado-asignaciones.component').then(m => m.EmpleadoAsignacionesComponent)
      },
      {
        path: 'dominios/:dominioId',
        canActivate: [domainGuard],
        loadComponent: () => import('./inventario/inventario.component').then(m => m.InventarioComponent)
      },
      {
        path: 'asignaciones',
        loadComponent: () => import('./asignaciones/asignaciones.component').then(m => m.AsignacionesComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
