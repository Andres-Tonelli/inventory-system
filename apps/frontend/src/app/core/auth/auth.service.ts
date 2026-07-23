import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, tap } from 'rxjs';
import { ApiResult } from '@inventory-system/api-contract';

export interface Administrador {
  id: number;
  username: string;
  nombre: string;
  rol: 'SISTEMA' | 'DOMINIO';
  dominios: number[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly currentUser = signal<Administrador | null>(null);

  constructor(private http: HttpClient) {
    const saved = localStorage.getItem('inventory_user');
    if (saved) {
      this.currentUser.set(JSON.parse(saved));
    }
  }

  login(username: string, password?: string): Observable<ApiResult<{ token: string; user: Administrador }>> {
    return this.http.post<ApiResult<{ token: string; user: Administrador }>>('/api/auth/login', { username, password }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentUser.set(response.data.user);
          localStorage.setItem('inventory_user', JSON.stringify(response.data.user));
          localStorage.setItem('inventory_token', response.data.token);
        }
      }),
      catchError((err) =>
        of({ success: false, message: err.error?.message || 'Error en el login' } as ApiResult<{ token: string; user: Administrador }>),
      ),
    );
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('inventory_user');
    localStorage.removeItem('inventory_token');
  }

  getToken(): string | null {
    return localStorage.getItem('inventory_token');
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  isSystemAdmin(): boolean {
    const user = this.currentUser();
    return user ? user.rol === 'SISTEMA' : false;
  }

  hasDomainAccess(dominioId: number): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.rol === 'SISTEMA') return true;
    return user.dominios.includes(dominioId);
  }
}
