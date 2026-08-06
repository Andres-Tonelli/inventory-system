import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, tap } from 'rxjs';
import { ApiResult } from '@inventory-system/api-contract';

export interface Administrador {
  id: number;
  username: string;
  nombre: string;
  rol: 'SISTEMA' | 'DOMINIO' | 'COLABORADOR';
  dominios: number[];
  empleadoId?: number;
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

  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      // Decode JWT payload (standard base64url)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      if (this.currentUser()) {
        this.logout();
      }
      return false;
    }
    return this.currentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.currentUser();
    return user ? (user.rol === 'SISTEMA' || user.rol === 'DOMINIO') : false;
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
