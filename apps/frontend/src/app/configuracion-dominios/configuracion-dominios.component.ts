import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';

import {
  CatalogosService,
  Dominio,
  TipoAgrupador,
  AtributoDefinicion,
  Categoria,
} from '../core/services/catalogos.service';
import { AuthService } from '../core/auth/auth.service';
import { EmpleadosService } from '../core/services/empleados.service';
import { ConfirmacionUiService } from '../core/confirmacion-ui.service';
import { NotificacionesUiService } from '../core/notificaciones-ui.service';
import { DOMINIO_ICONOS, DOMINIO_COLORES } from '@inventory-system/api-contract';

@Component({
  selector: 'app-configuracion-dominios',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, MultiSelectModule],
  templateUrl: './configuracion-dominios.component.html',
  styleUrl: './configuracion-dominios.component.scss',
})
export class ConfiguracionDominiosComponent implements OnInit {
  dominios: Dominio[] = [];
  selectedId: number | null = null;
  tiposByDom: Record<number, TipoAgrupador[]> = {};
  adminsByDom: Record<number, any[]> = {};
  empleadosRed: any[] = [];
  activeTab: 'tipos' | 'administradores' = 'tipos';

  // Diálogos
  showDominioDialog = false;
  editingDominioId: number | null = null;
  dominioForm = { nombre: '', icono: 'box', color: 'indigo' };

  readonly iconos = DOMINIO_ICONOS;
  readonly colores = DOMINIO_COLORES;

  showTipoDialog = false;
  editingTipoId: number | null = null;
  tipoForm = { nombre: '', asignable: true, categoriaIds: [] as number[], subTipoIds: [] as number[] };
  categorias: Categoria[] = [];

  showAdminDialog = false;
  adminForm: { selectedEmpleado: any; rol: 'DOMINIO' | 'SISTEMA' } = { selectedEmpleado: null, rol: 'DOMINIO' };

  readonly asignableOptions = [
    { label: 'Asignable a persona', value: true },
    { label: 'Contenedor / ubicación', value: false },
  ];
  readonly tipoDatoOptions = [
    { label: 'Texto', value: 'TEXTO' },
    { label: 'Número', value: 'NUMERO' },
    { label: 'Fecha', value: 'FECHA' },
    { label: 'Booleano', value: 'BOOLEANO' },
  ];
  readonly rolOptions = [
    { label: 'Administrador de Dominio', value: 'DOMINIO' },
    { label: 'Administrador de Sistema', value: 'SISTEMA' },
  ];

  constructor(
    private catalogos: CatalogosService,
    private confirmUi: ConfirmacionUiService,
    private notificaciones: NotificacionesUiService,
    private authService: AuthService,
    private empleadosService: EmpleadosService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  isSystemAdmin(): boolean {
    return this.authService.isSystemAdmin();
  }

  get selected(): Dominio | null {
    return this.dominios.find((d) => d.id === this.selectedId) ?? null;
  }
  get tipos(): TipoAgrupador[] {
    return this.selectedId ? this.tiposByDom[this.selectedId] ?? [] : [];
  }
  get filteredTiposParaRecomendacion(): TipoAgrupador[] {
    return this.tipos.filter((t) => t.id !== this.editingTipoId);
  }
  countTipos(d: Dominio): number {
    return d.id ? this.tiposByDom[d.id]?.length ?? 0 : 0;
  }

  loadAll(): void {
    this.catalogos.getDominios().subscribe((res) => {
      if (!res.success) return;
      const allDomains = res.data;
      const user = this.authService.currentUser();
      if (user && user.rol !== 'SISTEMA') {
        this.dominios = allDomains.filter(d => d.id && user.dominios.includes(d.id));
      } else {
        this.dominios = allDomains;
      }
      if (this.selectedId == null && this.dominios.length) {
        this.selectedId = this.dominios[0].id ?? null;
      }
      if (this.selectedId) {
        this.loadCategorias(this.selectedId);
      }
      this.dominios.forEach((d) => {
        if (d.id) this.loadDominioConfig(d.id);
      });
    });
  }

  loadCategorias(domId: number): void {
    this.catalogos.getCategorias(domId).subscribe((res) => {
      if (res.success) this.categorias = res.data;
    });
  }

  loadDominioConfig(id: number): void {
    this.catalogos.getTiposAgrupador(id).subscribe((r) => {
      if (r.success) this.tiposByDom = { ...this.tiposByDom, [id]: r.data };
    });
    if (this.isSystemAdmin()) {
      this.catalogos.getAdministradoresDelDominio(id).subscribe((r) => {
        if (r.success) this.adminsByDom = { ...this.adminsByDom, [id]: r.data };
      });
    }
  }

  select(d: Dominio): void {
    this.selectedId = d.id ?? null;
    this.activeTab = 'tipos';
    if (d.id) this.loadCategorias(d.id);
  }

  // ---- Dominio ----
  openNewDominio(): void {
    this.editingDominioId = null;
    this.dominioForm = { nombre: '', icono: 'box', color: 'indigo' };
    this.showDominioDialog = true;
  }
  openEditDominio(d: Dominio, ev?: Event): void {
    ev?.stopPropagation();
    this.editingDominioId = d.id ?? null;
    this.dominioForm = { nombre: d.nombre, icono: d.icono || 'box', color: d.color || 'indigo' };
    this.showDominioDialog = true;
  }
  saveDominio(): void {
    const nombre = this.dominioForm.nombre.trim();
    if (!nombre) return;
    const data = { nombre, icono: this.dominioForm.icono, color: this.dominioForm.color };
    const esEdicion = !!this.editingDominioId;
    const done = () => {
      this.notificaciones.exito(esEdicion ? `Dominio "${nombre}" actualizado.` : `Dominio "${nombre}" creado.`);
      this.showDominioDialog = false;
      this.loadAll();
    };
    if (this.editingDominioId) {
      this.catalogos.updateDominio(this.editingDominioId, data).subscribe(done);
    } else {
      this.catalogos.createDominio(data).subscribe(done);
    }
  }
  deleteDominio(d: Dominio, ev?: Event): void {
    ev?.stopPropagation();
    if (!d.id) return;
    const id = d.id;
    this.confirmUi.eliminar(`¿Eliminar el dominio "${d.nombre}"? Se pierde su configuración de tipos y atributos.`, () => {
      this.catalogos.deleteDominio(id).subscribe({
        next: () => {
          this.notificaciones.exito(`Dominio "${d.nombre}" eliminado.`);
          if (this.selectedId === id) this.selectedId = null;
          this.loadAll();
        },
        error: (e) => this.notificaciones.errorHttp(e, 'No se pudo eliminar el dominio.'),
      });
    });
  }

  // ---- Tipo de agrupador ----
  openNewTipo(): void {
    this.editingTipoId = null;
    this.tipoForm = { nombre: '', asignable: true, categoriaIds: [], subTipoIds: [] };
    this.showTipoDialog = true;
  }
  openEditTipo(t: TipoAgrupador): void {
    this.editingTipoId = t.id ?? null;
    const categoriaIds = (t.categoriasRecomendadas || []).map((cr: any) => cr.categoria.id).filter(Boolean);
    const subTipoIds = (t.subTiposRecomendados || []).map((sr: any) => sr.childTipo.id).filter(Boolean);
    this.tipoForm = { nombre: t.nombre, asignable: t.asignable ?? true, categoriaIds, subTipoIds };
    this.showTipoDialog = true;
  }
  saveTipo(): void {
    const nombre = this.tipoForm.nombre.trim();
    if (!nombre || !this.selectedId) return;
    const domId = this.selectedId;
    const esEdicion = !!this.editingTipoId;
    const done = () => {
      this.notificaciones.exito(esEdicion ? 'Tipo de agrupador actualizado.' : 'Tipo de agrupador creado.');
      this.showTipoDialog = false;
      this.loadDominioConfig(domId);
    };
    const payload = {
      nombre,
      asignable: this.tipoForm.asignable,
      categoriaIds: this.tipoForm.categoriaIds,
      subTipoIds: this.tipoForm.subTipoIds
    };
    if (this.editingTipoId) {
      this.catalogos
        .updateTipoAgrupador(this.editingTipoId, payload)
        .subscribe(done);
    } else {
      this.catalogos
        .createTipoAgrupador(domId, payload)
        .subscribe(done);
    }
  }
  deleteTipo(t: TipoAgrupador): void {
    if (!t.id || !this.selectedId) return;
    const id = t.id;
    const domId = this.selectedId;
    this.confirmUi.eliminar(`¿Eliminar el tipo "${t.nombre}"?`, () => {
      this.catalogos.deleteTipoAgrupador(id).subscribe({
        next: () => {
          this.notificaciones.exito(`Tipo "${t.nombre}" eliminado.`);
          this.loadDominioConfig(domId);
        },
        error: (e) => this.notificaciones.errorHttp(e, 'No se pudo eliminar el tipo.'),
      });
    });
  }


  // ---- Administradores ----
  get administradores(): any[] {
    return this.selectedId ? this.adminsByDom[this.selectedId] ?? [] : [];
  }
  openNewAdmin(): void {
    this.adminForm = { selectedEmpleado: null, rol: 'DOMINIO' };
    this.empleadosService.getEmpleados().subscribe((res) => {
      if (res.success) this.empleadosRed = res.data;
    });
    this.showAdminDialog = true;
  }
  saveAdmin(): void {
    const emp = this.adminForm.selectedEmpleado;
    if (!emp || !this.selectedId) return;
    const username = emp.legajo; // sAMAccountName mapea a legajo
    const nombre = emp.nombre;
    const domId = this.selectedId;
    this.catalogos.asociarAdministradorADominio(domId, { username, nombre, rol: this.adminForm.rol }).subscribe({
      next: () => {
        this.notificaciones.exito(`Administrador "${nombre}" asociado al dominio.`);
        this.showAdminDialog = false;
        this.loadDominioConfig(domId);
      },
      error: (e) => this.notificaciones.errorHttp(e, 'No se pudo asociar el administrador.')
    });
  }
  deleteAdmin(admin: any): void {
    if (!admin.id || !this.selectedId) return;
    const adminId = admin.id;
    const domId = this.selectedId;
    this.confirmUi.eliminar(`¿Desvincular a "${admin.nombre}" como administrador de este dominio?`, () => {
      this.catalogos.desvincularAdministradorDeDominio(domId, adminId).subscribe({
        next: () => {
          this.notificaciones.exito(`Administrador "${admin.nombre}" desvinculado.`);
          this.loadDominioConfig(domId);
        },
        error: (e) => this.notificaciones.errorHttp(e, 'No se pudo desvincular al administrador.')
      });
    });
  }
}
