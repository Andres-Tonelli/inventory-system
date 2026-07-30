import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { UnitOfWork, Repository, Criteria, EstadoCodigo } from '@inventory-system/backend-domain';
import { Agrupador, Articulo } from '@prisma/client';

@Injectable()
export class AgrupadoresService {
  constructor(
    @Inject('UnitOfWork') private readonly uow: UnitOfWork,
    @Inject('AgrupadorRepository') private readonly agrupadorRepo: Repository<Agrupador>,
    @Inject('ArticuloRepository') private readonly articuloRepo: Repository<Articulo>,
  ) {}

  async create(data: any) {
    const entity = {
      nombre: data.nombre,
      tipoAgrupadorId: data.tipoAgrupadorId,
      agrupadorPadreId: data.agrupadorPadreId || null,
    };
    try {
      await this.agrupadorRepo.save(entity as any);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya existe un agrupador con ese nombre para este tipo de agrupador.');
      }
      throw e;
    }
  }

  async findAll(dominioId?: number, tipoAgrupadorId?: number) {
    const criteria = new Criteria();
    if (tipoAgrupadorId) {
      criteria.filters.push({ field: 'tipoAgrupadorId', operator: 'eq', value: Number(tipoAgrupadorId) });
    } else if (dominioId) {
      criteria.filters.push({ field: 'dominioId', operator: 'eq', value: Number(dominioId) });
    }
    return this.agrupadorRepo.search(criteria);
  }

  async findOne(id: number) {
    return this.agrupadorRepo.findById(id);
  }

  async addArticulo(agrupadorId: number, articuloId: number) {
    return this.uow.execute(async () => {
      const articulo: any = await this.articuloRepo.findById(articuloId);
      if (!articulo) throw new BadRequestException('Artículo no encontrado');
      if (articulo.estado?.codigo === EstadoCodigo.EN_USO) {
        throw new BadRequestException('Artículo asignado a empleado. No puede ser agregado.');
      }

      // Contención: sólo se setea agrupadorId. El estado (condición) no cambia (ADR-0004 D2/D4).
      articulo.agrupadorId = agrupadorId;
      await this.articuloRepo.save(articulo);
      return { success: true };
    });
  }

  async removeArticulo(articuloId: number) {
    return this.uow.execute(async () => {
      const articulo: any = await this.articuloRepo.findById(articuloId);
      if (!articulo) throw new BadRequestException('Artículo no encontrado');

      articulo.agrupadorId = null;
      await this.articuloRepo.save(articulo);
      return { success: true };
    });
  }

  async addSubAgrupador(parentAgrupadorId: number, childAgrupadorId: number) {
    return this.uow.execute(async () => {
      const parent: any = await this.agrupadorRepo.findById(parentAgrupadorId);
      const child: any = await this.agrupadorRepo.findById(childAgrupadorId);

      if (!parent || !child) throw new BadRequestException('Agrupador no encontrado');
      if (parentAgrupadorId === childAgrupadorId) {
        throw new BadRequestException('Un agrupador no puede ser sub-agrupador de sí mismo');
      }

      // Evitar ciclos: recorrer hacia arriba la cadena de padres.
      let currentParent: any = parent;
      while (currentParent.agrupadorPadreId) {
        if (currentParent.agrupadorPadreId === childAgrupadorId) {
          throw new BadRequestException('Dependencia circular detectada');
        }
        const nextParent = await this.agrupadorRepo.findById(currentParent.agrupadorPadreId);
        if (!nextParent) break;
        currentParent = nextParent;
      }

      child.agrupadorPadreId = parentAgrupadorId;
      await this.agrupadorRepo.save(child);
      return { success: true };
    });
  }

  async removeSubAgrupador(childAgrupadorId: number) {
    return this.uow.execute(async () => {
      const child: any = await this.agrupadorRepo.findById(childAgrupadorId);
      if (!child) throw new BadRequestException('Agrupador no encontrado');

      child.agrupadorPadreId = null;
      await this.agrupadorRepo.save(child);
      return { success: true };
    });
  }
}
