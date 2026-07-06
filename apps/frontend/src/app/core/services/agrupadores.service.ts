import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { ApiResponse, Agrupador, CreateAgrupadorDto } from '@inventory-system/api-contract';

// Re-export para no romper los imports existentes de los componentes.
export type { Agrupador } from '@inventory-system/api-contract';

@Injectable({ providedIn: 'root' })
export class AgrupadoresService {
  private apiUrl = '/api/agrupadores';

  constructor(private http: HttpClient) {}

  getAgrupadores(dominioId?: number, tipoAgrupadorId?: number): Observable<ApiResponse<Agrupador[]>> {
    let url = '/api/agrupadores?';
    if (dominioId) url += `dominioId=${dominioId}&`;
    if (tipoAgrupadorId) url += `tipoAgrupadorId=${tipoAgrupadorId}&`;
    return this.http.get<ApiResponse<Agrupador[]>>(url);
  }

  createAgrupador(data: CreateAgrupadorDto): Observable<any> {
    return this.http.post('/api/agrupadores', data);
  }

  addArticulo(agrupadorId: number, articuloId: number): Observable<{ success: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/${agrupadorId}/articulos`, { articuloId });
  }

  removeArticulo(articuloId: number): Observable<{ success: boolean }> {
    return this.http.delete<any>(`${this.apiUrl}/articulos/${articuloId}`);
  }

  addSubAgrupador(parentAgrupadorId: number, childAgrupadorId: number): Observable<{ success: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/${parentAgrupadorId}/subagrupadores`, { childAgrupadorId });
  }

  removeSubAgrupador(childAgrupadorId: number): Observable<{ success: boolean }> {
    return this.http.delete<any>(`${this.apiUrl}/subagrupadores/${childAgrupadorId}`);
  }

  getAgrupador(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
