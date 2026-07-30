import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  Dominio,
  Categoria,
  Marca,
  Modelo,
  AtributoDefinicion,
  TipoAgrupador,
  EstadoArticulo,
} from '@inventory-system/api-contract';

// Re-export para no romper los imports existentes de los componentes.
// La definición vive ahora en @inventory-system/api-contract.
export type {
  Dominio,
  Categoria,
  Marca,
  Modelo,
  AtributoDefinicion,
  TipoAgrupador,
  EstadoArticulo,
} from '@inventory-system/api-contract';

@Injectable({
  providedIn: 'root',
})
export class CatalogosService {
  constructor(private http: HttpClient) {}

  // ---- DOMINIOS ----
  getDominios(): Observable<ApiResponse<Dominio[]>> {
    return this.http.get<ApiResponse<Dominio[]>>('/api/catalogos/dominios');
  }
  createDominio(data: { nombre: string; icono?: string; color?: string }) {
    return this.http.post('/api/catalogos/dominios', data);
  }
  updateDominio(id: number, data: { nombre: string; icono?: string; color?: string }) {
    return this.http.put(`/api/catalogos/dominios/${id}`, data);
  }
  deleteDominio(id: number) {
    return this.http.delete(`/api/catalogos/dominios/${id}`);
  }

  // ---- CATEGORIAS ----
  getCategorias(dominioId?: number): Observable<ApiResponse<Categoria[]>> {
    const url = dominioId ? `/api/catalogos/categorias?dominioId=${dominioId}` : '/api/catalogos/categorias';
    return this.http.get<ApiResponse<Categoria[]>>(url);
  }
  createCategoria(data: { nombre: string; dominioId: number }) {
    return this.http.post('/api/catalogos/categorias', data);
  }
  updateCategoria(id: number, data: { nombre?: string }) {
    return this.http.put(`/api/catalogos/categorias/${id}`, data);
  }
  // ---- ATRIBUTOS DINÁMICOS ----
  getAtributos(categoriaId: number): Observable<ApiResponse<AtributoDefinicion[]>> {
    return this.http.get<ApiResponse<AtributoDefinicion[]>>(`/api/catalogos/categorias/${categoriaId}/atributos`);
  }
  createAtributo(categoriaId: number, data: { nombre: string; clave: string; tipoDato: string }) {
    return this.http.post(`/api/catalogos/categorias/${categoriaId}/atributos`, data);
  }
  getAtributosPorDominio(dominioId: number): Observable<ApiResponse<AtributoDefinicion[]>> {
    return this.http.get<ApiResponse<AtributoDefinicion[]>>(`/api/catalogos/dominios/${dominioId}/atributos`);
  }
  updateAtributo(id: number, data: { nombre?: string; clave?: string; tipoDato?: string }) {
    return this.http.put(`/api/catalogos/atributos/${id}`, data);
  }
  deleteAtributo(id: number) {
    return this.http.delete(`/api/catalogos/atributos/${id}`);
  }

  // ---- MARCAS ----
  getMarcas(dominioId?: number): Observable<ApiResponse<Marca[]>> {
    const url = dominioId ? `/api/catalogos/marcas?dominioId=${dominioId}` : '/api/catalogos/marcas';
    return this.http.get<ApiResponse<Marca[]>>(url);
  }
  createMarca(data: { nombre: string; dominioId: number }) {
    return this.http.post('/api/catalogos/marcas', data);
  }
  updateMarca(id: number, nombre: string) {
    return this.http.put(`/api/catalogos/marcas/${id}`, { nombre });
  }

  // ---- MODELOS ----
  getModelos(categoriaId?: number, dominioId?: number): Observable<ApiResponse<Modelo[]>> {
    let url = '/api/catalogos/modelos?';
    if (categoriaId) url += `categoriaId=${categoriaId}&`;
    if (dominioId) url += `dominioId=${dominioId}&`;
    return this.http.get<ApiResponse<Modelo[]>>(url);
  }
  createModelo(data: { nombre: string; marcaId: number; categoriaId: number }) {
    return this.http.post('/api/catalogos/modelos', data);
  }
  updateModelo(id: number, data: { nombre?: string; marcaId?: number; categoriaId?: number }) {
    return this.http.put(`/api/catalogos/modelos/${id}`, data);
  }

  // ---- TIPOS DE AGRUPADOR ----
  getTiposAgrupador(dominioId: number): Observable<ApiResponse<TipoAgrupador[]>> {
    return this.http.get<ApiResponse<TipoAgrupador[]>>(`/api/catalogos/dominios/${dominioId}/tipos-agrupador`);
  }
  createTipoAgrupador(dominioId: number, data: { nombre: string; asignable?: boolean }) {
    return this.http.post(`/api/catalogos/dominios/${dominioId}/tipos-agrupador`, data);
  }
  updateTipoAgrupador(id: number, data: { nombre?: string; asignable?: boolean }) {
    return this.http.put(`/api/catalogos/tipos-agrupador/${id}`, data);
  }
  deleteTipoAgrupador(id: number) {
    return this.http.delete(`/api/catalogos/tipos-agrupador/${id}`);
  }

  // ---- ESTADOS DE ARTÍCULO ----
  getEstados(): Observable<ApiResponse<EstadoArticulo[]>> {
    return this.http.get<ApiResponse<EstadoArticulo[]>>('/api/catalogos/estados');
  }
  createEstado(nombre: string): Observable<any> {
    return this.http.post('/api/catalogos/estados', { nombre });
  }
  updateEstado(id: number, nombre: string) {
    return this.http.put(`/api/catalogos/estados/${id}`, { nombre });
  }
  deleteEstado(id: number) {
    return this.http.delete(`/api/catalogos/estados/${id}`);
  }

  // ---- ADMINISTRADORES ----
  getAdministradoresDelDominio(dominioId: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`/api/auth/dominios/${dominioId}/administradores`);
  }
  asociarAdministradorADominio(dominioId: number, data: { username: string; nombre: string; rol?: string }) {
    return this.http.post(`/api/auth/dominios/${dominioId}/administradores`, data);
  }
  desvincularAdministradorDeDominio(dominioId: number, adminId: number) {
    return this.http.delete(`/api/auth/dominios/${dominioId}/administradores/${adminId}`);
  }

  // ---- GLOBAL ADMINISTRATORS ----
  getAllAdministradores(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('/api/auth/administradores');
  }
  createAdministrador(data: { username: string; nombre: string; rol: string; dominios?: number[] }) {
    return this.http.post('/api/auth/administradores', data);
  }
  updateAdministrador(id: number, data: { nombre: string; rol: string; dominios?: number[] }) {
    return this.http.put(`/api/auth/administradores/${id}`, data);
  }
  deleteAdministrador(id: number) {
    return this.http.delete(`/api/auth/administradores/${id}`);
  }
}
