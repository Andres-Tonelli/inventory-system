import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, tap } from 'rxjs';
import { ApiResult, Empleado, API_ROUTES } from '@inventory-system/api-contract';

// Re-export para compatibilidad con posibles imports existentes.
export type { Empleado } from '@inventory-system/api-contract';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Usamos Signals de Angular para almacenar el estado del empleado activo
  readonly currentUser = signal<Empleado | null>(null);

  constructor(private http: HttpClient) {
    // Persistencia simple en localStorage (soft-login, sin token). Ver ADR-0003.
    const saved = localStorage.getItem('inventory_user');
    if (saved) {
      this.currentUser.set(JSON.parse(saved));
    }
  }

  login(legajo: string): Observable<ApiResult<Empleado>> {
    return this.http.post<ApiResult<Empleado>>(API_ROUTES.empleados.login, { legajo }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
          localStorage.setItem('inventory_user', JSON.stringify(response.data));
        }
      }),
      catchError((err) =>
        of({ success: false, message: err.error?.message || 'Error en el login' } as ApiResult<Empleado>),
      ),
    );
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('inventory_user');
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
