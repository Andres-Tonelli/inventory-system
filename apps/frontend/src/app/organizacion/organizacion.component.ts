import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { EmpleadosService, Empleado, Area } from '../core/services/empleados.service';
import { CatalogosService, EstadoArticulo } from '../core/services/catalogos.service';
import { ConfirmacionUiService } from '../core/confirmacion-ui.service';
import { NotificacionesUiService } from '../core/notificaciones-ui.service';

@Component({
  selector: 'app-organizacion',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, InputTextModule, SelectModule],
  templateUrl: './organizacion.component.html',
  styleUrl: './organizacion.component.scss',
})
export class OrganizacionComponent implements OnInit {
  activeTab: 'empleados' | 'areas' | 'estados' = 'empleados';

  empleados: Empleado[] = [];
  areas: Area[] = [];
  estados: EstadoArticulo[] = [];

  showEmpDialog = false;
  editEmpId: number | null = null;
  empForm = { nombre: '', legajo: '', areaId: null as number | null };

  showAreaDialog = false;
  editAreaId: number | null = null;
  areaForm = { nombre: '' };

  showEstadoDialog = false;
  editEstadoId: number | null = null;
  estadoForm = { nombre: '' };

  constructor(
    private empleadosSvc: EmpleadosService,
    private catalogosSvc: CatalogosService,
    private confirmUi: ConfirmacionUiService,
    private notificaciones: NotificacionesUiService,
    private router: Router,
  ) {}

  verAsignaciones(e: Empleado): void {
    if (e.id) this.router.navigate(['/configuracion/organizacion/empleados', e.id]);
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.empleadosSvc.getEmpleados().subscribe((r) => {
      if (r.success) this.empleados = r.data;
    });
    this.empleadosSvc.getAreas().subscribe((r) => {
      if (r.success) this.areas = r.data;
    });
    this.catalogosSvc.getEstados().subscribe((r) => {
      if (r.success) this.estados = r.data;
    });
  }

  // ---- Empleados ----
  openNewEmp(): void {
    this.editEmpId = null;
    this.empForm = { nombre: '', legajo: '', areaId: this.areas[0]?.id ?? null };
    this.showEmpDialog = true;
  }
  openEditEmp(e: Empleado): void {
    this.editEmpId = e.id ?? null;
    this.empForm = { nombre: e.nombre, legajo: e.legajo, areaId: e.areaId };
    this.showEmpDialog = true;
  }
  saveEmp(): void {
    const nombre = this.empForm.nombre.trim();
    const legajo = this.empForm.legajo.trim();
    if (!nombre || !legajo || !this.empForm.areaId) return;
    const data = { nombre, legajo, areaId: this.empForm.areaId };
    const done = () => {
      this.showEmpDialog = false;
      this.loadAll();
    };
    if (this.editEmpId) this.empleadosSvc.updateEmpleado(this.editEmpId, data).subscribe(done);
    else this.empleadosSvc.createEmpleado(data).subscribe(done);
  }
  deleteEmp(e: Empleado): void {
    if (!e.id) return;
    const id = e.id;
    this.confirmUi.eliminar(`¿Eliminar a "${e.nombre}"?`, () => {
      this.empleadosSvc.deleteEmpleado(id).subscribe({
        next: () => this.loadAll(),
        error: (x) => this.notificaciones.errorHttp(x, 'No se pudo eliminar el empleado.'),
      });
    });
  }

  // ---- Áreas ----
  openNewArea(): void {
    this.editAreaId = null;
    this.areaForm = { nombre: '' };
    this.showAreaDialog = true;
  }
  openEditArea(a: Area): void {
    this.editAreaId = a.id ?? null;
    this.areaForm = { nombre: a.nombre };
    this.showAreaDialog = true;
  }
  saveArea(): void {
    const nombre = this.areaForm.nombre.trim();
    if (!nombre) return;
    const done = () => {
      this.showAreaDialog = false;
      this.loadAll();
    };
    if (this.editAreaId) this.empleadosSvc.updateArea(this.editAreaId, nombre).subscribe(done);
    else this.empleadosSvc.createArea(nombre).subscribe(done);
  }
  deleteArea(a: Area): void {
    if (!a.id) return;
    const id = a.id;
    this.confirmUi.eliminar(`¿Eliminar el área "${a.nombre}"?`, () => {
      this.empleadosSvc.deleteArea(id).subscribe({
        next: () => this.loadAll(),
        error: (x) => this.notificaciones.errorHttp(x, 'No se pudo eliminar el área.'),
      });
    });
  }

  // ---- Estados ----
  openNewEstado(): void {
    this.editEstadoId = null;
    this.estadoForm = { nombre: '' };
    this.showEstadoDialog = true;
  }
  openEditEstado(s: EstadoArticulo): void {
    this.editEstadoId = s.id ?? null;
    this.estadoForm = { nombre: s.nombre };
    this.showEstadoDialog = true;
  }
  saveEstado(): void {
    const nombre = this.estadoForm.nombre.trim();
    if (!nombre) return;
    const done = () => {
      this.showEstadoDialog = false;
      this.loadAll();
    };
    if (this.editEstadoId) this.catalogosSvc.updateEstado(this.editEstadoId, nombre).subscribe(done);
    else this.catalogosSvc.createEstado(nombre).subscribe(done);
  }
  deleteEstado(s: EstadoArticulo): void {
    if (!s.id) return;
    const id = s.id;
    this.confirmUi.eliminar(`¿Eliminar el estado "${s.nombre}"? Los artículos que lo usan lo impiden.`, () => {
      this.catalogosSvc.deleteEstado(id).subscribe({
        next: () => this.loadAll(),
        error: (x) => this.notificaciones.errorHttp(x, 'No se pudo eliminar el estado.'),
      });
    });
  }
}
