import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, AspectoChecklist, Checklist, CreateChecklistDto, CreateAspectoDto, ChecklistInstancia, CreateChecklistInstanciaDto } from '@inventory-system/api-contract';

@Injectable({
  providedIn: 'root',
})
export class ChecklistsService {
  constructor(private http: HttpClient) {}

  getAspectos(dominioId: number): Observable<ApiResponse<AspectoChecklist[]>> {
    return this.http.get<ApiResponse<AspectoChecklist[]>>(`/api/catalogos/dominios/${dominioId}/aspectos`);
  }

  crearAspecto(dominioId: number, dto: CreateAspectoDto): Observable<ApiResponse<AspectoChecklist>> {
    return this.http.post<ApiResponse<AspectoChecklist>>(`/api/catalogos/dominios/${dominioId}/aspectos`, dto);
  }

  eliminarAspecto(dominioId: number, id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`/api/catalogos/dominios/${dominioId}/aspectos/${id}`);
  }

  getChecklists(filters?: { dominioId?: number; categoriaId?: number; tipoAgrupadorId?: number; ambito?: string }): Observable<ApiResponse<Checklist[]>> {
    let url = '/api/checklists';
    const params: string[] = [];
    if (filters?.dominioId != null) params.push(`dominioId=${filters.dominioId}`);
    if (filters?.categoriaId != null) params.push(`categoriaId=${filters.categoriaId}`);
    if (filters?.tipoAgrupadorId != null) params.push(`tipoAgrupadorId=${filters.tipoAgrupadorId}`);
    if (filters?.ambito != null) params.push(`ambito=${filters.ambito}`);
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return this.http.get<ApiResponse<Checklist[]>>(url);
  }

  crearChecklist(dto: CreateChecklistDto): Observable<ApiResponse<Checklist>> {
    return this.http.post<ApiResponse<Checklist>>('/api/checklists', dto);
  }

  actualizarChecklist(id: number, dto: CreateChecklistDto): Observable<ApiResponse<Checklist>> {
    return this.http.put<ApiResponse<Checklist>>(`/api/checklists/${id}`, dto);
  }

  eliminarChecklist(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`/api/checklists/${id}`);
  }

  getChecklistInstancias(filters?: {
    articuloId?: number;
    agrupadorId?: number;
    dominioId?: number;
    checklistId?: number;
    responsable?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Observable<ApiResponse<ChecklistInstancia[]>> {
    let url = '/api/checklists/instancias';
    const params: string[] = [];
    if (filters?.articuloId != null) params.push(`articuloId=${filters.articuloId}`);
    if (filters?.agrupadorId != null) params.push(`agrupadorId=${filters.agrupadorId}`);
    if (filters?.dominioId != null) params.push(`dominioId=${filters.dominioId}`);
    if (filters?.checklistId != null) params.push(`checklistId=${filters.checklistId}`);
    if (filters?.responsable != null) params.push(`responsable=${encodeURIComponent(filters.responsable)}`);
    if (filters?.fechaDesde != null) params.push(`fechaDesde=${filters.fechaDesde}`);
    if (filters?.fechaHasta != null) params.push(`fechaHasta=${filters.fechaHasta}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return this.http.get<ApiResponse<ChecklistInstancia[]>>(url);
  }

  getChecklistInstanciaById(id: number): Observable<ApiResponse<ChecklistInstancia>> {
    return this.http.get<ApiResponse<ChecklistInstancia>>(`/api/checklists/instancias/${id}`);
  }

  crearChecklistInstancia(dto: CreateChecklistInstanciaDto): Observable<ApiResponse<ChecklistInstancia>> {
    return this.http.post<ApiResponse<ChecklistInstancia>>('/api/checklists/instancias', dto);
  }
}
