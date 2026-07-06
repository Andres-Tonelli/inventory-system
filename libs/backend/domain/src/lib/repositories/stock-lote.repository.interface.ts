import { Repository } from './repository.interface';
import { StockLote } from '@prisma/client';

export interface StockLoteRepository extends Repository<StockLote> {
  /**
   * Descuenta ATÓMICAMENTE `cantidad` del lote, sólo si hay stock suficiente.
   * Devuelve `true` si se descontó, `false` si no alcanzaba (o el lote no existe).
   * Evita el lost-update de leer-modificar-guardar (ver REVISION A2).
   */
  descontarStock(loteId: number, cantidad: number): Promise<boolean>;

  /** Incrementa atómicamente el stock disponible del lote. */
  agregarStock(loteId: number, cantidad: number): Promise<void>;
}
