import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Asignacion } from '@inventory-system/api-contract';

// Re-export para no romper los imports existentes de los componentes.
export type { Asignacion } from '@inventory-system/api-contract';

@Injectable({
  providedIn: 'root',
})
export class AsignacionesService {
  constructor(private http: HttpClient) {}

  getAsignaciones(dominioId?: number): Observable<ApiResponse<Asignacion[]>> {
    let url = '/api/asignaciones';
    if (dominioId) url += `?dominioId=${dominioId}`;
    return this.http.get<ApiResponse<Asignacion[]>>(url);
  }

  getAsignacionesDeEmpleado(
    empleadoId: number,
  ): Observable<ApiResponse<{ agrupadores: any[]; articulos: any[]; historial: any[] }>> {
    return this.http.get<ApiResponse<{ agrupadores: any[]; articulos: any[]; historial: any[] }>>(
      `/api/asignaciones/empleado/${empleadoId}`,
    );
  }

  devolverAsignacionArticulo(asignacionId: number) {
    return this.http.patch(`/api/asignaciones/articulos/${asignacionId}/devolver`, {});
  }

  devolverAsignacionAgrupador(asignacionId: number) {
    return this.http.patch(`/api/asignaciones/agrupadores/${asignacionId}/devolver`, {});
  }

  createAsignacion(data: { articuloId: number; empleadoId: number; observaciones?: string }) {
    return this.http.post('/api/asignaciones/articulos', data);
  }

  createAsignacionAgrupador(data: { agrupadorId: number; empleadoId: number; observaciones?: string }) {
    return this.http.post('/api/asignaciones/agrupadores', data);
  }

  createAsignacionConsumible(data: { loteId: number; empleadoId: number; cantidad: number }) {
    return this.http.post('/api/asignaciones/consumibles', data);
  }
}
