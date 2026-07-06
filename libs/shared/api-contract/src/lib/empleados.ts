/**
 * Contrato del contexto Empleados / Áreas.
 */

export interface Area {
  id?: number;
  nombre: string;
}

export interface Empleado {
  id?: number;
  legajo: string;
  nombre: string;
  areaId: number;
  area?: Area;
}

// --- Write DTOs ---

export interface CreateAreaDto {
  nombre: string;
}

export interface CreateEmpleadoDto {
  nombre: string;
  legajo: string;
  areaId: number;
}

/**
 * "Soft-login": identifica al empleado por legajo, sin contraseña.
 * Es identificación, NO autenticación. Ver ADR-0003.
 */
export interface LoginDto {
  legajo: string;
}

// --- Update DTOs ---

export interface UpdateAreaDto {
  nombre: string;
}

export interface UpdateEmpleadoDto {
  nombre?: string;
  legajo?: string;
  areaId?: number;
}
