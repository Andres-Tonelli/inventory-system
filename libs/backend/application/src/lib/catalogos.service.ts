import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Repository, Criteria, EstadoArticuloRepository } from '@inventory-system/backend-domain';
import { DominioInventario, Categoria, Marca, Modelo, AtributoDefinicion, EstadoArticulo, TipoAgrupador } from '@prisma/client';

@Injectable()
export class CatalogosService {
  constructor(
    @Inject('DominioRepository') private readonly dominioRepo: Repository<DominioInventario>,
    @Inject('CategoriaRepository') private readonly categoriaRepo: Repository<Categoria>,
    @Inject('MarcaRepository') private readonly marcaRepo: Repository<Marca>,
    @Inject('ModeloRepository') private readonly modeloRepo: Repository<Modelo>,
    @Inject('AtributoRepository') private readonly atributoRepo: Repository<AtributoDefinicion>,
    @Inject('TipoAgrupadorRepository') private readonly tipoAgrupadorRepo: Repository<TipoAgrupador>,
    @Inject('EstadoArticuloRepository') private readonly estadoRepo: EstadoArticuloRepository,
  ) {}

  async createDominio(data: { nombre: string; icono?: string; color?: string }) {
    // Al no pasarle ID, Prisma asumirá que es una creación nueva.
    const nuevo = {
      nombre: data.nombre,
      icono: data.icono ?? null,
      color: data.color ?? null,
    } as DominioInventario;
    try {
      await this.dominioRepo.save(nuevo);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya existe un dominio con ese nombre.');
      }
      throw e;
    }
  }

  async getDominios(searchParams?: { nombre?: string }) {
    const criteria = new Criteria();
    
    // Aquí usamos nuestro Patrón Criteria genérico sin saber que abajo hay Prisma
    if (searchParams?.nombre) {
      criteria.filters.push({ 
        field: 'nombre', 
        operator: 'contains', 
        value: searchParams.nombre 
      });
    }

    return this.dominioRepo.search(criteria);
  }

  // ---- CATEGORIAS ----
  async createCategoria(data: any) {
    try {
      await this.categoriaRepo.save(data as Categoria);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya existe una categoría con ese nombre en este dominio.');
      }
      throw e;
    }
  }

  async getCategorias(searchParams?: { nombre?: string, dominioId?: number }) {
    const criteria = new Criteria();
    if (searchParams?.nombre) criteria.filters.push({ field: 'nombre', operator: 'contains', value: searchParams.nombre });
    if (searchParams?.dominioId) criteria.filters.push({ field: 'dominioId', operator: 'eq', value: Number(searchParams.dominioId) });
    return this.categoriaRepo.search(criteria);
  }

  // ---- MARCAS ----
  async createMarca(data: any) {
    try {
      await this.marcaRepo.save(data as Marca);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya existe una marca con ese nombre en este dominio.');
      }
      throw e;
    }
  }

  async getMarcas(searchParams?: { nombre?: string, dominioId?: number }) {
    const criteria = new Criteria();
    if (searchParams?.nombre) criteria.filters.push({ field: 'nombre', operator: 'contains', value: searchParams.nombre });
    if (searchParams?.dominioId) criteria.filters.push({ field: 'dominioId', operator: 'eq', value: Number(searchParams.dominioId) });
    return this.marcaRepo.search(criteria);
  }

  // ---- MODELOS ----
  async createModelo(data: any) {
    try {
      await this.modeloRepo.save(data as Modelo);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya existe un modelo con ese nombre para esta marca y categoría.');
      }
      throw e;
    }
  }

  async getModelos(searchParams?: { nombre?: string, marcaId?: number, categoriaId?: number, dominioId?: number }) {
    const criteria = new Criteria();
    if (searchParams?.nombre) criteria.filters.push({ field: 'nombre', operator: 'contains', value: searchParams.nombre });
    if (searchParams?.marcaId) criteria.filters.push({ field: 'marcaId', operator: 'eq', value: Number(searchParams.marcaId) });
    if (searchParams?.categoriaId) criteria.filters.push({ field: 'categoriaId', operator: 'eq', value: Number(searchParams.categoriaId) });
    if (searchParams?.dominioId) criteria.filters.push({ field: 'dominioId', operator: 'eq', value: Number(searchParams.dominioId) });
    return this.modeloRepo.search(criteria);
  }

  // ---- ATRIBUTOS DINÁMICOS ----
  async createAtributo(data: any) {
    try {
      await this.atributoRepo.save(data as AtributoDefinicion);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const target = e.meta?.target;
        if (Array.isArray(target) && target.includes('nombre')) {
          throw new BadRequestException('Ya existe un atributo con ese nombre en esta categoría.');
        }
        if (Array.isArray(target) && target.includes('clave')) {
          throw new BadRequestException('Ya existe un atributo con esa clave interna en esta categoría.');
        }
        throw new BadRequestException('Ya existe un atributo con ese nombre o clave interna en esta categoría.');
      }
      throw e;
    }
  }

  async getAtributosPorCategoria(categoriaId: number) {
    const criteria = new Criteria([{ field: 'categoriaId', operator: 'eq', value: categoriaId }]);
    return this.atributoRepo.search(criteria);
  }

  async getAtributosPorDominio(dominioId: number) {
    const criteria = new Criteria([{ field: 'categoria', operator: 'eq', value: { dominioId } }]);
    return this.atributoRepo.search(criteria);
  }

  // ---- TIPOS DE AGRUPADOR ----
  async createTipoAgrupador(data: { nombre: string; dominioId: number; asignable?: boolean }) {
    try {
      await this.tipoAgrupadorRepo.save({
        nombre: data.nombre,
        dominioId: data.dominioId,
        ...(data.asignable !== undefined && { asignable: data.asignable }),
      } as any);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya existe un tipo de agrupador con ese nombre en este dominio.');
      }
      throw e;
    }
  }

  async getTiposAgrupador(dominioId?: number) {
    const criteria = new Criteria();
    if (dominioId) {
      criteria.filters.push({ field: 'dominioId', operator: 'eq', value: Number(dominioId) });
    }
    return this.tipoAgrupadorRepo.search(criteria);
  }

  async createEstado(nombre: string, codigo?: string): Promise<void> {
    // El código estable se deriva del nombre si no se provee explícito.
    const cod = (codigo ?? nombre)
      .trim()
      .toUpperCase()
      .replace(/Á/g, 'A')
      .replace(/É/g, 'E')
      .replace(/Í/g, 'I')
      .replace(/Ó/g, 'O')
      .replace(/Ú/g, 'U')
      .replace(/Ñ/g, 'N')
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    await this.estadoRepo.crear(nombre, cod);
  }

  async getEstados(): Promise<EstadoArticulo[]> {
    return this.estadoRepo.listar();
  }

  // ---- UPDATE / DELETE (config de dominios) ----

  async updateCategoria(id: number, data: { nombre?: string; tipoSeguimiento?: string }) {
    const patch: any = { id };
    if (data.nombre !== undefined) patch.nombre = data.nombre;
    if (data.tipoSeguimiento !== undefined) patch.tipoSeguimiento = data.tipoSeguimiento;
    await this.categoriaRepo.save(patch);
  }

  async updateMarca(id: number, nombre: string) {
    await this.marcaRepo.save({ id, nombre } as any);
  }

  async updateModelo(id: number, data: { nombre?: string; detalle?: string; marcaId?: number; categoriaId?: number; atributos?: any }) {
    const patch: any = { id };
    if (data.nombre !== undefined) patch.nombre = data.nombre;
    if (data.detalle !== undefined) patch.detalle = data.detalle;
    if (data.marcaId !== undefined) patch.marcaId = Number(data.marcaId);
    if (data.categoriaId !== undefined) patch.categoriaId = Number(data.categoriaId);
    if (data.atributos !== undefined) patch.atributos = data.atributos;
    await this.modeloRepo.save(patch);
  }

  async deleteCategoria(id: number) {
    try {
      await this.categoriaRepo.delete(id);
    } catch {
      throw new BadRequestException(
        'No se puede eliminar la categoría: tiene modelos o atributos asociados.',
      );
    }
  }

  async deleteMarca(id: number) {
    try {
      await this.marcaRepo.delete(id);
    } catch {
      throw new BadRequestException('No se puede eliminar la marca: tiene modelos asociados.');
    }
  }

  async deleteModelo(id: number) {
    try {
      await this.modeloRepo.delete(id);
    } catch {
      throw new BadRequestException(
        'No se puede eliminar el modelo: tiene artículos o lotes de stock asociados.',
      );
    }
  }

  async updateDominio(id: number, data: { nombre: string; icono?: string; color?: string }) {
    // Sólo persiste los campos presentes: no pisar icono/color si el caller no los envía.
    const patch: any = { id, nombre: data.nombre };
    if (data.icono !== undefined) patch.icono = data.icono;
    if (data.color !== undefined) patch.color = data.color;
    await this.dominioRepo.save(patch);
  }

  async deleteDominio(id: number) {
    try {
      await this.dominioRepo.delete(id);
    } catch {
      throw new BadRequestException(
        'No se puede eliminar el dominio: tiene categorías, marcas, atributos o tipos de agrupador asociados.',
      );
    }
  }

  async updateTipoAgrupador(id: number, data: { nombre?: string; asignable?: boolean }) {
    await this.tipoAgrupadorRepo.save({ id, ...data } as any);
  }

  async deleteTipoAgrupador(id: number) {
    try {
      await this.tipoAgrupadorRepo.delete(id);
    } catch {
      throw new BadRequestException('No se puede eliminar el tipo: tiene agrupadores asociados.');
    }
  }

  async updateAtributo(id: number, data: { nombre?: string; clave?: string; tipoDato?: string }) {
    try {
      await this.atributoRepo.save({ id, ...data } as any);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const target = e.meta?.target;
        if (Array.isArray(target) && target.includes('nombre')) {
          throw new BadRequestException('Ya existe un atributo con ese nombre en esta categoría.');
        }
        if (Array.isArray(target) && target.includes('clave')) {
          throw new BadRequestException('Ya existe un atributo con esa clave interna en esta categoría.');
        }
        throw new BadRequestException('Ya existe un atributo con ese nombre o clave interna en esta categoría.');
      }
      throw e;
    }
  }

  async deleteAtributo(id: number) {
    await this.atributoRepo.delete(id);
  }

  async updateEstado(id: number, nombre: string) {
    await this.estadoRepo.actualizar(id, nombre);
  }

  async deleteEstado(id: number) {
    try {
      await this.estadoRepo.eliminar(id);
    } catch {
      throw new BadRequestException('No se puede eliminar el estado: hay artículos que lo usan.');
    }
  }
}
