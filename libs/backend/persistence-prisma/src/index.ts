/**
 * @inventory-system/backend-persistence
 *
 * Capa de persistencia (adaptadores Prisma). Implementa los puertos de `backend-domain`.
 * Expone el módulo Nest global de persistencia y los servicios de infraestructura que otras
 * capas inyectan por tipo (PrismaService, PrismaTransactionContext). Ver ADR-0001 / ADR-0005.
 *
 * Los repositorios concretos son internos: se consumen por token desde PrismaModule
 * ('ArticuloRepository', 'UnitOfWork', etc.), no por import directo.
 */
export * from './lib/prisma.module';
export * from './lib/prisma.service';
export * from './lib/prisma-transaction-context';
