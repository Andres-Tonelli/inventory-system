import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/login');
};

export const systemAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isSystemAdmin()) {
    return true;
  }

  return router.parseUrl('/');
};

export const domainGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Try to find dominioId parameter in the route tree
  let dominioIdStr = route.paramMap.get('dominioId');
  
  // If not direct parameter, search parents (sometimes parameters are at parent route level)
  let parent = route.parent;
  while (!dominioIdStr && parent) {
    dominioIdStr = parent.paramMap.get('dominioId');
    parent = parent.parent;
  }

  if (dominioIdStr) {
    const dominioId = Number(dominioIdStr);
    if (!isNaN(dominioId) && authService.isAuthenticated() && authService.hasDomainAccess(dominioId)) {
      return true;
    }
  }

  return router.parseUrl('/');
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/');
};
