import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { EmpleadosService, Empleado, Area } from '../core/services/empleados.service';
import { ConfirmacionUiService } from '../core/confirmacion-ui.service';
import { NotificacionesUiService } from '../core/notificaciones-ui.service';
import { PaginadorComponent, paginar } from '../core/ui/paginador.component';

@Component({
  selector: 'app-organizacion',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, InputTextModule, SelectModule, PaginadorComponent],
  templateUrl: './organizacion.component.html',
  styleUrl: './organizacion.component.scss',
})
export class OrganizacionComponent implements OnInit {
  activeTab: 'empleados' | 'areas' = 'empleados';

  empleados: Empleado[] = [];
  areas: Area[] = [];

  // Variables de paginación
  paginaEmpleados = 1;
  paginaAreas = 1;

  // Filtros de búsqueda
  searchEmpleado = '';
  searchArea = '';

  // Ordenamiento
  sortEmpCol = '';
  sortEmpAsc = true;
  sortAreaCol = '';
  sortAreaAsc = true;

  toggleSortEmp(col: string) {
    if (this.sortEmpCol === col) {
      this.sortEmpAsc = !this.sortEmpAsc;
    } else {
      this.sortEmpCol = col;
      this.sortEmpAsc = true;
    }
  }

  toggleSortArea(col: string) {
    if (this.sortAreaCol === col) {
      this.sortAreaAsc = !this.sortAreaAsc;
    } else {
      this.sortAreaCol = col;
      this.sortAreaAsc = true;
    }
  }

  getSortEmpIcon(col: string): string {
    if (this.sortEmpCol !== col) return 'pi-sort';
    return this.sortEmpAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  getSortAreaIcon(col: string): string {
    if (this.sortAreaCol !== col) return 'pi-sort';
    return this.sortAreaAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  get filteredAndSortedEmpleados(): Empleado[] {
    let result = [...this.empleados];
    const search = this.searchEmpleado.toLowerCase().trim();
    if (search) {
      result = result.filter(e => 
        (e.nombre || '').toLowerCase().includes(search) ||
        (e.legajo || '').toLowerCase().includes(search) ||
        (e.area?.nombre || '').toLowerCase().includes(search)
      );
    }
    if (this.sortEmpCol) {
      result.sort((a, b) => {
        let valA: any = a[this.sortEmpCol as keyof Empleado];
        let valB: any = b[this.sortEmpCol as keyof Empleado];
        if (this.sortEmpCol === 'area') {
          valA = a.area?.nombre || '';
          valB = b.area?.nombre || '';
        }
        valA = valA ? String(valA).toLowerCase() : '';
        valB = valB ? String(valB).toLowerCase() : '';
        return this.sortEmpAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }

  get filteredAndSortedAreas(): Area[] {
    let result = [...this.areas];
    const search = this.searchArea.toLowerCase().trim();
    if (search) {
      result = result.filter(a => (a.nombre || '').toLowerCase().includes(search));
    }
    if (this.sortAreaCol) {
      result.sort((a, b) => {
        const valA = (a.nombre || '').toLowerCase();
        const valB = (b.nombre || '').toLowerCase();
        return this.sortAreaAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }

  get paginatedEmpleados(): Empleado[] {
    return paginar(this.filteredAndSortedEmpleados, this.paginaEmpleados);
  }

  get paginatedAreas(): Area[] {
    return paginar(this.filteredAndSortedAreas, this.paginaAreas);
  }

  showEmpDialog = false;
  editEmpId: number | null = null;
  empForm = { nombre: '', legajo: '', areaId: null as number | null };

  showAreaDialog = false;
  editAreaId: number | null = null;
  areaForm = { nombre: '' };

  constructor(
    private empleadosSvc: EmpleadosService,
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
    const esEdicion = !!this.editEmpId;
    const done = () => {
      this.notificaciones.exito(esEdicion ? `Empleado "${nombre}" actualizado.` : `Empleado "${nombre}" registrado.`);
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
        next: () => {
          this.notificaciones.exito(`Empleado "${e.nombre}" eliminado.`);
          this.loadAll();
        },
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
    const esEdicion = !!this.editAreaId;
    const done = () => {
      this.notificaciones.exito(esEdicion ? `Área "${nombre}" actualizada.` : `Área "${nombre}" creada.`);
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
        next: () => {
          this.notificaciones.exito(`Área "${a.nombre}" eliminada.`);
          this.loadAll();
        },
        error: (x) => this.notificaciones.errorHttp(x, 'No se pudo eliminar el área.'),
      });
    });
  }


}
