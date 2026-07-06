import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaUnitOfWork } from './prisma-unit-of-work';

import { PrismaArticuloRepository } from './repositories/prisma-articulo.repository';
import { PrismaStockLoteRepository } from './repositories/prisma-lote.repository';
import { PrismaEntregaConsumibleRepository } from './repositories/prisma-entrega-consumible.repository';
import { PrismaEstadoArticuloRepository } from './repositories/prisma-estado-articulo.repository';
import { PrismaAsignacionRepository } from './repositories/prisma-asignacion.repository';
import { PrismaAsignacionAgrupadorRepository } from './repositories/prisma-asignacion-agrupador.repository';
import { PrismaAgrupadorRepository } from './repositories/prisma-agrupador.repository';
import { PrismaTipoAgrupadorRepository } from './repositories/prisma-tipo-agrupador.repository';
import { PrismaDominioRepository } from './repositories/prisma-dominio.repository';
import { PrismaCategoriaRepository } from './repositories/prisma-categoria.repository';
import { PrismaMarcaRepository } from './repositories/prisma-marca.repository';
import { PrismaModeloRepository } from './repositories/prisma-modelo.repository';
import { PrismaAtributoRepository } from './repositories/prisma-atributo.repository';
import { PrismaAreaRepository } from './repositories/prisma-area.repository';
import { PrismaEmpleadoRepository } from './repositories/prisma-empleado.repository';

/**
 * Módulo de persistencia (global). Concentra TODO el acceso a datos en un solo lugar:
 * el cliente Prisma, el contexto de transacción, el Unit of Work y todos los repositorios
 * (puertos → adaptadores Prisma) expuestos por token. Ver ADR-0005.
 */
const REPOSITORIES = [
  { provide: 'ArticuloRepository', useClass: PrismaArticuloRepository },
  { provide: 'StockLoteRepository', useClass: PrismaStockLoteRepository },
  { provide: 'EntregaConsumibleRepository', useClass: PrismaEntregaConsumibleRepository },
  { provide: 'EstadoArticuloRepository', useClass: PrismaEstadoArticuloRepository },
  { provide: 'AsignacionRepository', useClass: PrismaAsignacionRepository },
  { provide: 'AsignacionAgrupadorRepository', useClass: PrismaAsignacionAgrupadorRepository },
  { provide: 'AgrupadorRepository', useClass: PrismaAgrupadorRepository },
  { provide: 'TipoAgrupadorRepository', useClass: PrismaTipoAgrupadorRepository },
  { provide: 'DominioRepository', useClass: PrismaDominioRepository },
  { provide: 'CategoriaRepository', useClass: PrismaCategoriaRepository },
  { provide: 'MarcaRepository', useClass: PrismaMarcaRepository },
  { provide: 'ModeloRepository', useClass: PrismaModeloRepository },
  { provide: 'AtributoRepository', useClass: PrismaAtributoRepository },
  { provide: 'AreaRepository', useClass: PrismaAreaRepository },
  { provide: 'EmpleadoRepository', useClass: PrismaEmpleadoRepository },
];

const REPOSITORY_TOKENS = REPOSITORIES.map((r) => r.provide);

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTransactionContext,
    { provide: 'UnitOfWork', useClass: PrismaUnitOfWork },
    ...REPOSITORIES,
  ],
  exports: [
    PrismaService,
    PrismaTransactionContext,
    'UnitOfWork',
    ...REPOSITORY_TOKENS,
  ],
})
export class PrismaModule {}
