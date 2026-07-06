import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Repository, Criteria } from '@inventory-system/backend-domain';
import { Area, Empleado } from '@prisma/client';

@Injectable()
export class EmpleadosService {
  constructor(
    @Inject('AreaRepository') private readonly areaRepo: Repository<Area>,
    @Inject('EmpleadoRepository') private readonly empleadoRepo: Repository<Empleado>
  ) {}

  async createArea(nombre: string) {
    await this.areaRepo.save({ nombre } as Area);
  }

  async getAreas() {
    return this.areaRepo.search(new Criteria());
  }

  async createEmpleado(data: any) {
    await this.empleadoRepo.save(data as Empleado);
  }

  async getEmpleados(searchParams?: { legajo?: string, nombre?: string, areaId?: number }) {
    const criteria = new Criteria();
    if (searchParams?.legajo) criteria.filters.push({ field: 'legajo', operator: 'eq', value: searchParams.legajo });
    if (searchParams?.nombre) criteria.filters.push({ field: 'nombre', operator: 'contains', value: searchParams.nombre });
    if (searchParams?.areaId) criteria.filters.push({ field: 'areaId', operator: 'eq', value: Number(searchParams.areaId) });
    return this.empleadoRepo.search(criteria);
  }

  // ---- UPDATE / DELETE ----

  async updateArea(id: number, nombre: string) {
    await this.areaRepo.save({ id, nombre } as any);
  }

  async deleteArea(id: number) {
    try {
      await this.areaRepo.delete(id);
    } catch {
      throw new BadRequestException('No se puede eliminar el área: tiene empleados asignados.');
    }
  }

  async updateEmpleado(id: number, data: { nombre?: string; legajo?: string; areaId?: number }) {
    await this.empleadoRepo.save({ id, ...data } as any);
  }

  async deleteEmpleado(id: number) {
    try {
      await this.empleadoRepo.delete(id);
    } catch {
      throw new BadRequestException(
        'No se puede eliminar el empleado: tiene asignaciones o entregas registradas.',
      );
    }
  }

  // "Soft" Login: Valida que exista el legajo
  async login(legajo: string) {
    const criteria = new Criteria([{ field: 'legajo', operator: 'eq', value: legajo }]);
    const resultados = await this.empleadoRepo.search(criteria);
    
    if (resultados.length === 0) {
      throw new UnauthorizedException('Legajo no encontrado en el sistema');
    }
    
    const empleado = resultados[0];
    // En un sistema real aquí se emitiría un JWT. 
    // Por ser soft-login retornamos el perfil para que la UI lo mantenga en estado.
    return empleado;
  }
}
