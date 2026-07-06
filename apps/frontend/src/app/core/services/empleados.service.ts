import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Empleado, Area } from '@inventory-system/api-contract';

// Re-export para no romper los imports existentes de los componentes.
export type { Empleado, Area } from '@inventory-system/api-contract';

@Injectable({
  providedIn: 'root',
})
export class EmpleadosService {
  constructor(private http: HttpClient) {}

  getEmpleados(): Observable<ApiResponse<Empleado[]>> {
    return this.http.get<ApiResponse<Empleado[]>>('/api/empleados');
  }

  createEmpleado(data: { nombre: string; legajo: string; areaId: number }): Observable<any> {
    return this.http.post<any>('/api/empleados', data);
  }
  updateEmpleado(id: number, data: { nombre?: string; legajo?: string; areaId?: number }): Observable<any> {
    return this.http.put<any>(`/api/empleados/${id}`, data);
  }
  deleteEmpleado(id: number): Observable<any> {
    return this.http.delete<any>(`/api/empleados/${id}`);
  }

  getAreas(): Observable<ApiResponse<Area[]>> {
    return this.http.get<ApiResponse<Area[]>>('/api/empleados/areas');
  }

  createArea(nombre: string): Observable<any> {
    return this.http.post<any>('/api/empleados/areas', { nombre });
  }
  updateArea(id: number, nombre: string): Observable<any> {
    return this.http.put<any>(`/api/empleados/areas/${id}`, { nombre });
  }
  deleteArea(id: number): Observable<any> {
    return this.http.delete<any>(`/api/empleados/areas/${id}`);
  }
}
