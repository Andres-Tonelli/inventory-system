import { EstadoArticulo } from '@prisma/client';

export interface EstadoArticuloRepository {
  crear(nombre: string, codigo: string): Promise<void>;
  listar(): Promise<EstadoArticulo[]>;
  actualizar(id: number, nombre: string): Promise<void>;
  eliminar(id: number): Promise<void>;
}
