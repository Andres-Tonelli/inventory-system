import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Articulo, StockLote } from '@inventory-system/api-contract';

// Re-export para no romper los imports existentes de los componentes.
export type { Articulo } from '@inventory-system/api-contract';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  constructor(private http: HttpClient) {}

  getArticulos(dominioId?: number, estado?: string, categoriaId?: number): Observable<ApiResponse<Articulo[]>> {
    let url = '/api/inventario/articulos?';
    if (dominioId) url += `dominioId=${dominioId}&`;
    if (estado) url += `estado=${estado}&`;
    if (categoriaId) url += `categoriaId=${categoriaId}&`;
    return this.http.get<ApiResponse<Articulo[]>>(url);
  }

  createArticulo(data: Partial<Articulo>) {
    return this.http.post('/api/inventario/articulos', data);
  }

  updateArticulo(id: number, data: Partial<Articulo>) {
    return this.http.put(`/api/inventario/articulos/${id}`, data);
  }

  cambiarEstadoArticulo(id: number, estadoCodigo: string) {
    return this.http.patch(`/api/inventario/articulos/${id}/estado`, { estadoCodigo });
  }

  getLotes(dominioId?: number): Observable<ApiResponse<StockLote[]>> {
    let url = '/api/inventario/lotes?';
    if (dominioId) url += `dominioId=${dominioId}`;
    return this.http.get<ApiResponse<StockLote[]>>(url);
  }

  createLote(data: { cantidadDisponible: number; modeloId: number }): Observable<any> {
    return this.http.post('/api/inventario/lotes', data);
  }

  consumirLote(loteId: number, cantidad: number): Observable<any> {
    return this.http.post(`/api/inventario/lotes/${loteId}/consumir`, { cantidad });
  }

  adicionarLote(loteId: number, cantidad: number): Observable<any> {
    return this.http.post(`/api/inventario/lotes/${loteId}/adicionar`, { cantidad });
  }
}
