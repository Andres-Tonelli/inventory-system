/**
 * @inventory-system/backend-application
 *
 * Capa de aplicación: los casos de uso (services). Dependen de los puertos de
 * `backend-domain` (interfaces) y del contexto de persistencia, nunca de repos concretos.
 * Los controllers (en apps/backend) los inyectan. Ver ADR-0001.
 */
export * from './lib/catalogos.service';
export * from './lib/inventario.service';
export * from './lib/asignaciones.service';
export * from './lib/agrupadores.service';
export * from './lib/empleados.service';
