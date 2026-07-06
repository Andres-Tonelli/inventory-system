/**
 * @inventory-system/backend-domain
 *
 * Capa de dominio del backend: puertos (interfaces de repositorio + Unit of Work),
 * el patrón Criteria y constantes de dominio. Sin dependencias de NestJS ni de la
 * implementación de persistencia. Ver ADR-0001.
 *
 * NOTA: las interfaces de repositorio usan tipos de `@prisma/client` como entidades
 * (acoplamiento heredado). Desacoplarlo requeriría entidades de dominio propias (futuro).
 */
export * from './lib/criteria/criteria';
export * from './lib/repositories/repository.interface';
export * from './lib/repositories/unit-of-work.interface';
export * from './lib/repositories/agrupador.repository.interface';
export * from './lib/repositories/asignacion-agrupador.repository.interface';
export * from './lib/repositories/tipo-agrupador.repository.interface';
export * from './lib/repositories/stock-lote.repository.interface';
export * from './lib/repositories/entrega-consumible.repository.interface';
export * from './lib/repositories/estado-articulo.repository.interface';
export * from './lib/estado-codigo';
