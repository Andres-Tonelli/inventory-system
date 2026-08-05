import { EstadoArticulo } from '@prisma/client';

export interface EstadoArticuloRepository {
  crear(nombre: string, codigo: string, dominioId: number): Promise<void>;
  listar(dominioId: number): Promise<EstadoArticulo[]>;
  actualizar(id: number, nombre: string): Promise<void>;
  eliminar(id: number): Promise<void>;
}
