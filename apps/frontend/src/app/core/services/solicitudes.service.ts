import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Solicitud, CreateSolicitudDto, ResolverSolicitudDto } from '@inventory-system/api-contract';

@Injectable({
  providedIn: 'root',
})
export class SolicitudesService {
  constructor(private http: HttpClient) {}

  getSolicitudes(dominioId?: number, empleadoId?: number): Observable<ApiResponse<Solicitud[]>> {
    let url = '/api/solicitudes';
    const params: string[] = [];
    if (dominioId != null) params.push(`dominioId=${dominioId}`);
    if (empleadoId != null) params.push(`empleadoId=${empleadoId}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return this.http.get<ApiResponse<Solicitud[]>>(url);
  }

  crearSolicitud(dto: CreateSolicitudDto): Observable<Solicitud> {
    return this.http.post<Solicitud>('/api/solicitudes', dto);
  }

  resolverSolicitud(id: number, dto: ResolverSolicitudDto): Observable<ApiResponse<Solicitud>> {
    return this.http.patch<ApiResponse<Solicitud>>(`/api/solicitudes/${id}/resolver`, dto);
  }
}
