import { Criteria } from '../criteria/criteria';
import { EntregaConsumible } from '@prisma/client';

export interface CrearEntregaConsumible {
  loteId: number;
  empleadoId: number;
  cantidadEntregada: number;
}

export interface EntregaConsumibleRepository {
  crear(data: CrearEntregaConsumible): Promise<EntregaConsumible>;
  search(criteria: Criteria): Promise<EntregaConsumible[]>;
}
