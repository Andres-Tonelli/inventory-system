/**
 * @inventory-system/api-contract
 *
 * Contrato REST compartido entre el frontend (Angular) y el backend (NestJS).
 * Es la ÚNICA fuente de verdad de los tipos que cruzan la red: DTOs de request,
 * read-models de response, el envelope ApiResponse<T> y las rutas de la API.
 *
 * Reglas:
 *  - Sin dependencias de @prisma/client, @angular/* ni @nestjs/*. Sólo tipos puros.
 *  - Las fechas viajan como string ISO (así las serializa JSON sobre HTTP).
 */
export * from './lib/common';
export * from './lib/catalogos';
export * from './lib/empleados';
export * from './lib/agrupadores';
export * from './lib/inventario';
export * from './lib/asignaciones';
export * from './lib/routes';
export * from './lib/solicitudes';
export * from './lib/checklist';
