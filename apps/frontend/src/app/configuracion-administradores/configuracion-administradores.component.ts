import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { CatalogosService, Dominio } from '../core/services/catalogos.service';
import { EmpleadosService, Empleado } from '../core/services/empleados.service';
import { ConfirmacionUiService } from '../core/confirmacion-ui.service';
import { NotificacionesUiService } from '../core/notificaciones-ui.service';

@Component({
  selector: 'app-configuracion-administradores',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule],
  templateUrl: './configuracion-administradores.component.html',
  styleUrl: './configuracion-administradores.component.scss',
})
export class ConfiguracionAdministradoresComponent implements OnInit {
  admins: any[] = [];
  dominios: Dominio[] = [];
  empleadosRed: Empleado[] = [];

  showDialog = false;
  editingAdminId: number | null = null;

  // Filtros de búsqueda
  searchAdmin = '';

  // Ordenamiento
  sortAdminCol = '';
  sortAdminAsc = true;

  toggleSort(col: string) {
    if (this.sortAdminCol === col) {
      this.sortAdminAsc = !this.sortAdminAsc;
    } else {
      this.sortAdminCol = col;
      this.sortAdminAsc = true;
    }
  }

  getSortIcon(col: string): string {
    if (this.sortAdminCol !== col) return 'pi-sort';
    return this.sortAdminAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  get filteredAndSortedAdmins(): any[] {
    let result = [...this.admins];
    const search = this.searchAdmin.toLowerCase().trim();
    if (search) {
      result = result.filter(a => 
        (a.username || '').toLowerCase().includes(search) ||
        (a.nombre || '').toLowerCase().includes(search) ||
        (a.rol || '').toLowerCase().includes(search) ||
        this.getAdminDomainsLabel(a).toLowerCase().includes(search)
      );
    }
    if (this.sortAdminCol) {
      result.sort((a, b) => {
        let valA: any;
        let valB: any;
        if (this.sortAdminCol === 'dominios') {
          valA = this.getAdminDomainsLabel(a);
          valB = this.getAdminDomainsLabel(b);
        } else {
          valA = a[this.sortAdminCol];
          valB = b[this.sortAdminCol];
        }
        valA = valA ? String(valA).toLowerCase() : '';
        valB = valB ? String(valB).toLowerCase() : '';
        return this.sortAdminAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }

  // Formulario
  adminForm = {
    selectedEmpleado: null as any,
    nombre: '',
    rol: 'DOMINIO' as 'DOMINIO' | 'SISTEMA',
    dominios: [] as number[],
  };

  readonly rolOptions = [
    { label: 'Administrador de Dominio (Restringido)', value: 'DOMINIO' },
    { label: 'Administrador de Sistema (Total)', value: 'SISTEMA' },
  ];

  constructor(
    private catalogos: CatalogosService,
    private empleadosService: EmpleadosService,
    private confirmUi: ConfirmacionUiService,
    private notificaciones: NotificacionesUiService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    // 1. Load administrators list
    this.catalogos.getAllAdministradores().subscribe((res) => {
      if (res.success) this.admins = res.data;
    });

    // 2. Load available domains
    this.catalogos.getDominios().subscribe((res) => {
      if (res.success) this.dominios = res.data;
    });

    // 3. Load AD network users
    this.empleadosService.getEmpleados().subscribe((res) => {
      if (res.success) this.empleadosRed = res.data;
    });
  }

  getAdminDomainsLabel(admin: any): string {
    if (admin.rol === 'SISTEMA') {
      return 'Todos (Acceso Global)';
    }
    if (!admin.dominios || admin.dominios.length === 0) {
      return 'Ninguno';
    }
    return admin.dominios.map((d: any) => d.dominio?.nombre || `ID: ${d.dominioId}`).join(', ');
  }

  openNewAdmin(): void {
    this.editingAdminId = null;
    this.adminForm = {
      selectedEmpleado: null,
      nombre: '',
      rol: 'DOMINIO',
      dominios: [],
    };
    this.showDialog = true;
  }

  openEditAdmin(admin: any): void {
    this.editingAdminId = admin.id;

    // Find the corresponding employee in network list (if available)
    const match = this.empleadosRed.find(e => e.legajo === admin.username) || null;

    this.adminForm = {
      selectedEmpleado: match,
      nombre: admin.nombre,
      rol: admin.rol,
      dominios: admin.dominios.map((d: any) => d.dominioId),
    };
    this.showDialog = true;
  }

  onEmpleadoSelect(emp: any): void {
    if (emp) {
      // Automatically copy full name from the selected AD employee
      this.adminForm.nombre = emp.nombre;
    }
  }

  toggleDomain(domId: number | undefined): void {
    if (domId === undefined) return;
    const idx = this.adminForm.dominios.indexOf(domId);
    if (idx > -1) {
      this.adminForm.dominios.splice(idx, 1);
    } else {
      this.adminForm.dominios.push(domId);
    }
  }

  isDomainSelected(domId: number | undefined): boolean {
    if (domId === undefined) return false;
    return this.adminForm.dominios.includes(domId);
  }

  saveAdmin(): void {
    const rol = this.adminForm.rol;
    const nombre = this.adminForm.nombre.trim();

    if (!nombre) {
      this.notificaciones.error('Debes ingresar un nombre visible.');
      return;
    }

    if (rol === 'DOMINIO' && this.adminForm.dominios.length === 0) {
      this.notificaciones.error('Debes seleccionar al menos un dominio para un administrador de dominio.');
      return;
    }

    const payload = {
      nombre,
      rol,
      dominios: rol === 'DOMINIO' ? this.adminForm.dominios : [],
    };

    const done = () => {
      this.notificaciones.exito(this.editingAdminId ? 'Administrador actualizado.' : 'Administrador creado.');
      this.showDialog = false;
      this.loadAll();
    };

    if (this.editingAdminId) {
      this.catalogos.updateAdministrador(this.editingAdminId, payload).subscribe({
        next: done,
        error: (e) => this.notificaciones.errorHttp(e, 'No se pudo actualizar el administrador.')
      });
    } else {
      const emp = this.adminForm.selectedEmpleado;
      if (!emp) {
        this.notificaciones.error('Debes seleccionar un usuario de red.');
        return;
      }
      this.catalogos.createAdministrador({
        username: emp.legajo, // sAMAccountName mapea a legajo
        nombre,
        rol,
        dominios: rol === 'DOMINIO' ? this.adminForm.dominios : []
      }).subscribe({
        next: done,
        error: (e) => this.notificaciones.errorHttp(e, 'No se pudo crear el administrador.')
      });
    }
  }

  deleteAdmin(admin: any): void {
    this.confirmUi.eliminar(`¿Eliminar todos los privilegios administrativos de "${admin.nombre}"?`, () => {
      this.catalogos.deleteAdministrador(admin.id).subscribe({
        next: () => {
          this.notificaciones.exito(`Administrador "${admin.nombre}" eliminado.`);
          this.loadAll();
        },
        error: (e) => this.notificaciones.errorHttp(e, 'No se pudo eliminar el administrador.')
      });
    });
  }
}
