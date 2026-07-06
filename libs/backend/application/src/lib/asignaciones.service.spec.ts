import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service';
import {
  fakeUow,
  InMemoryRepo,
  InMemoryLoteRepo,
  InMemoryEntregaRepo,
} from './testing/fakes';

/**
 * Reglas de negocio de asignación (ADR-0004 D2/D3/D5) testeadas contra los puertos
 * del dominio con fakes in-memory: sin NestJS, sin Prisma, sin base de datos.
 */
describe('AsignacionesService', () => {
  let articuloRepo: InMemoryRepo<any>;
  let asignacionRepo: InMemoryRepo<any>;
  let asignacionAgrupadorRepo: InMemoryRepo<any>;
  let agrupadorRepo: InMemoryRepo<any>;
  let loteRepo: InMemoryLoteRepo;
  let entregaRepo: InMemoryEntregaRepo;
  let service: AsignacionesService;

  beforeEach(() => {
    articuloRepo = new InMemoryRepo();
    asignacionRepo = new InMemoryRepo();
    asignacionAgrupadorRepo = new InMemoryRepo();
    agrupadorRepo = new InMemoryRepo();
    loteRepo = new InMemoryLoteRepo();
    entregaRepo = new InMemoryEntregaRepo();
    service = new AsignacionesService(
      fakeUow() as any,
      articuloRepo as any,
      asignacionRepo as any,
      asignacionAgrupadorRepo as any,
      agrupadorRepo as any,
      loteRepo as any,
      entregaRepo as any,
    );
  });

  describe('asignarArticulo', () => {
    it('rechaza un artículo inexistente', async () => {
      await expect(service.asignarArticulo(99, 1)).rejects.toThrow(BadRequestException);
    });

    it('rechaza un artículo que ya está EN_USO', async () => {
      articuloRepo.seed({ id: 5, estado: { codigo: 'EN_USO' }, agrupadorId: null });
      await expect(service.asignarArticulo(5, 1)).rejects.toThrow(/ya se encuentra asignado/i);
    });

    it('rechaza un artículo contenido en un agrupador (contención ≠ asignación, D2)', async () => {
      articuloRepo.seed({ id: 5, estado: { codigo: 'DISPONIBLE' }, agrupadorId: 10 });
      await expect(service.asignarArticulo(5, 1)).rejects.toThrow(/parte de un Agrupador/i);
    });

    it('camino feliz: marca EN_USO y crea la asignación con fecha de entrega', async () => {
      articuloRepo.seed({ id: 5, estado: { codigo: 'DISPONIBLE' }, agrupadorId: null });

      await service.asignarArticulo(5, 7, 'con cargador');

      // El service escribe por CÓDIGO estable, nunca por id numérico (D4).
      expect(articuloRepo.savedWith[0].estadoCodigo).toBe('EN_USO');
      const asignaciones = [...asignacionRepo.items.values()];
      expect(asignaciones).toHaveLength(1);
      expect(asignaciones[0]).toMatchObject({ articuloId: 5, empleadoId: 7, observaciones: 'con cargador' });
      expect(asignaciones[0].fechaEntrega).toBeInstanceOf(Date);
    });
  });

  describe('asignarAgrupador', () => {
    it('rechaza un tipo NO asignable (contenedor/ubicación, D3)', async () => {
      agrupadorRepo.seed({
        id: 10, estado: 'DISPONIBLE',
        tipoAgrupador: { asignable: false },
        articulos: [],
      });
      await expect(service.asignarAgrupador(10, 7)).rejects.toThrow(/no es asignable/i);
    });

    it('rechaza un agrupador ya asignado', async () => {
      agrupadorRepo.seed({
        id: 10, estado: 'ASIGNADO',
        tipoAgrupador: { asignable: true },
        articulos: [],
      });
      await expect(service.asignarAgrupador(10, 7)).rejects.toThrow(/ya asignado/i);
    });

    it('camino feliz: estado ASIGNADO (único escritor, D5) + artículos directos a EN_USO (D2)', async () => {
      agrupadorRepo.seed({
        id: 10, estado: 'DISPONIBLE',
        tipoAgrupador: { asignable: true },
        articulos: [
          { id: 1, estado: { codigo: 'DISPONIBLE' } },
          { id: 2, estado: { codigo: 'DISPONIBLE' } },
        ],
        subAgrupadores: [{ id: 20, estado: 'DISPONIBLE' }],
      });

      await service.asignarAgrupador(10, 7, 'puesto nuevo');

      // Estado denormalizado escrito en el mismo caso de uso (D5).
      expect(agrupadorRepo.savedWith[0].estado).toBe('ASIGNADO');
      // Los artículos DIRECTOS pasan a EN_USO...
      const estadosEscritos = articuloRepo.savedWith.map((a) => a.estadoCodigo);
      expect(estadosEscritos).toEqual(['EN_USO', 'EN_USO']);
      // ...y NO se cascadea a sub-agrupadores (D2): ningún save sobre el sub 20.
      expect(agrupadorRepo.savedWith.some((a) => a.id === 20)).toBe(false);
      // Queda la asignación registrada.
      expect([...asignacionAgrupadorRepo.items.values()][0]).toMatchObject({ agrupadorId: 10, empleadoId: 7 });
    });
  });

  describe('asignarConsumible', () => {
    it('rechaza parámetros inválidos', async () => {
      await expect(service.asignarConsumible(1, 1, 0)).rejects.toThrow(/inválidos/i);
    });

    it('rechaza cuando el stock no alcanza (descuento atómico, sin tocar el lote)', async () => {
      loteRepo.seed({ id: 1, cantidadDisponible: 3 });
      await expect(service.asignarConsumible(1, 7, 5)).rejects.toThrow(/no hay suficiente stock/i);
      // El stock quedó intacto y no se registró ninguna entrega.
      expect(loteRepo.items.get(1).cantidadDisponible).toBe(3);
      expect(entregaRepo.entregas).toHaveLength(0);
    });

    it('camino feliz: descuenta y registra la entrega', async () => {
      loteRepo.seed({ id: 1, cantidadDisponible: 10 });

      await service.asignarConsumible(1, 7, 4);

      expect(loteRepo.items.get(1).cantidadDisponible).toBe(6);
      expect(entregaRepo.entregas[0]).toMatchObject({ loteId: 1, empleadoId: 7, cantidadEntregada: 4 });
    });
  });

  describe('getAsignacionesDeEmpleado', () => {
    it('devuelve sólo lo ACTIVO del empleado pedido (agrupadores enriquecidos + artículos sueltos)', async () => {
      agrupadorRepo.seed({ id: 10, nombre: 'PC-01', articulos: [{ id: 1 }, { id: 2 }] });
      asignacionAgrupadorRepo.seed(
        { id: 1, agrupadorId: 10, empleadoId: 7, fechaEntrega: new Date('2026-01-10'), observaciones: 'ok' },
        { id: 2, agrupadorId: 11, empleadoId: 7, fechaEntrega: new Date(), fechaDevolucion: new Date() }, // devuelta
        { id: 3, agrupadorId: 12, empleadoId: 8, fechaEntrega: new Date() }, // otro empleado
      );
      asignacionRepo.seed(
        { id: 1, articuloId: 5, empleadoId: 7, fechaEntrega: new Date('2026-02-01'), articulo: { id: 5, alias: 'NB-1' } },
        { id: 2, articuloId: 6, empleadoId: 8, fechaEntrega: new Date(), articulo: { id: 6 } },
      );

      const res = await service.getAsignacionesDeEmpleado(7);

      expect(res.agrupadores).toHaveLength(1);
      expect(res.agrupadores[0]).toMatchObject({ id: 10, nombre: 'PC-01', observaciones: 'ok' });
      expect(res.agrupadores[0].articulos).toHaveLength(2); // enriquecido con findById
      expect(res.articulos).toHaveLength(1);
      expect(res.articulos[0]).toMatchObject({ id: 5, alias: 'NB-1' });
    });
  });
});
