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

    it('camino feliz: estado ASIGNADO (único escritor, D5) + artículos directos a EN_USO (D2) con cascada recursiva', async () => {
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
      // ...y SÍ se cascadea a sub-agrupadores: el sub 20 debe ser guardado como ASIGNADO
      expect(agrupadorRepo.savedWith.some((a) => a.id === 20 && a.estado === 'ASIGNADO')).toBe(true);
      // Queda la asignación registrada.
      const allAgrupadorAsgs = [...asignacionAgrupadorRepo.items.values()];
      expect(allAgrupadorAsgs).toHaveLength(2);
      expect(allAgrupadorAsgs.some(a => a.agrupadorId === 10 && a.empleadoId === 7)).toBe(true);
      expect(allAgrupadorAsgs.some(a => a.agrupadorId === 20 && a.empleadoId === 7)).toBe(true);

      const allArtAsgs = [...asignacionRepo.items.values()];
      expect(allArtAsgs).toHaveLength(2);
      expect(allArtAsgs.some(a => a.articuloId === 1 && a.empleadoId === 7)).toBe(true);
      expect(allArtAsgs.some(a => a.articuloId === 2 && a.empleadoId === 7)).toBe(true);
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
      // La asignación devuelta del empleado 7 aparece en su historial (no en lo activo).
      expect(res.historial).toHaveLength(1);
      expect(res.historial[0].tipo).toBe('AGRUPADOR');
      expect(res.historial[0].fechaDevolucion).toBeInstanceOf(Date);
    });
  });

  describe('devolverArticulo', () => {
    it('rechaza asignación inexistente y doble devolución', async () => {
      await expect(service.devolverArticulo(99)).rejects.toThrow(/no encontrada/i);

      asignacionRepo.seed({ id: 1, articuloId: 5, empleadoId: 7, fechaDevolucion: new Date() });
      await expect(service.devolverArticulo(1)).rejects.toThrow(/ya fue devuelta/i);
    });

    it('camino feliz: estampa fechaDevolucion y el artículo vuelve a DISPONIBLE', async () => {
      asignacionRepo.seed({ id: 1, articuloId: 5, empleadoId: 7 });

      await service.devolverArticulo(1);

      expect(asignacionRepo.items.get(1).fechaDevolucion).toBeInstanceOf(Date);
      expect(articuloRepo.savedWith[0]).toMatchObject({ id: 5, estadoCodigo: 'DISPONIBLE' });
    });
  });

  describe('devolverAgrupador', () => {
    it('rechaza doble devolución', async () => {
      asignacionAgrupadorRepo.seed({ id: 1, agrupadorId: 10, empleadoId: 7, fechaDevolucion: new Date() });
      await expect(service.devolverAgrupador(1)).rejects.toThrow(/ya fue devuelta/i);
    });

    it('imagen espejo de asignar: DISPONIBLE + artículos EN_USO liberados, condición respetada', async () => {
      agrupadorRepo.seed({
        id: 10, estado: 'ASIGNADO',
        tipoAgrupador: { asignable: true },
        articulos: [
          { id: 1, estado: { codigo: 'EN_USO' } },
          { id: 2, estado: { codigo: 'EN_REPARACION' } }, // la condición NO se pisa al devolver
        ],
      });
      asignacionAgrupadorRepo.seed({ id: 1, agrupadorId: 10, empleadoId: 7 });

      await service.devolverAgrupador(1);

      expect(asignacionAgrupadorRepo.items.get(1).fechaDevolucion).toBeInstanceOf(Date);
      expect(agrupadorRepo.savedWith[0].estado).toBe('DISPONIBLE');
      // Sólo el artículo EN_USO vuelve a DISPONIBLE; el que está en reparación queda como está.
      expect(articuloRepo.savedWith).toHaveLength(1);
      expect(articuloRepo.savedWith[0]).toMatchObject({ id: 1, estadoCodigo: 'DISPONIBLE' });
    });
  });

  describe('multiAsignacion de Agrupador', () => {
    it('permite asignar a múltiples personas si el tipo de agrupador es multiAsignable', async () => {
      agrupadorRepo.seed({
        id: 10, estado: 'ASIGNADO',
        tipoAgrupador: { asignable: true, multiAsignable: true },
        articulos: [
          { id: 1, estado: { codigo: 'EN_USO' } },
        ],
      });
      // Ya tiene una asignación activa para el empleado 8
      asignacionAgrupadorRepo.seed({ id: 1, agrupadorId: 10, empleadoId: 8 });
      asignacionRepo.seed({ id: 1, articuloId: 1, empleadoId: 8 });

      // Ahora asignamos al empleado 7
      await service.asignarAgrupador(10, 7, 'segundo responsable');

      // Se debió crear la segunda asignación activa del agrupador
      const allAgrupadorAsgs = [...asignacionAgrupadorRepo.items.values()];
      expect(allAgrupadorAsgs.filter((a) => !a.fechaDevolucion)).toHaveLength(2);

      // Y también la del artículo para el empleado 7
      const allArtAsgs = [...asignacionRepo.items.values()];
      expect(allArtAsgs.filter((a) => !a.fechaDevolucion)).toHaveLength(2);
      expect(allArtAsgs.some(a => a.articuloId === 1 && a.empleadoId === 7)).toBe(true);
    });

    it('al devolver uno de los responsables, mantiene el agrupador y artículos en ASIGNADO/EN_USO para el otro', async () => {
      agrupadorRepo.seed({
        id: 10, estado: 'ASIGNADO',
        tipoAgrupador: { asignable: true, multiAsignable: true },
        articulos: [
          { id: 1, estado: { codigo: 'EN_USO' } },
        ],
      });
      // Empleado 8 y Empleado 7 están asignados
      asignacionAgrupadorRepo.seed(
        { id: 1, agrupadorId: 10, empleadoId: 8, fechaDevolucion: null },
        { id: 2, agrupadorId: 10, empleadoId: 7, fechaDevolucion: null }
      );
      asignacionRepo.seed(
        { id: 1, articuloId: 1, empleadoId: 8, fechaDevolucion: null },
        { id: 2, articuloId: 1, empleadoId: 7, fechaDevolucion: null }
      );

      // El empleado 7 devuelve su asignación
      await service.devolverAgrupador(2);

      // Su asignación del agrupador y artículo se cierran
      expect(asignacionAgrupadorRepo.items.get(2).fechaDevolucion).toBeInstanceOf(Date);
      expect(asignacionRepo.items.get(2).fechaDevolucion).toBeInstanceOf(Date);

      // Las de empleado 8 continúan activas
      expect(asignacionAgrupadorRepo.items.get(1).fechaDevolucion).toBeNull();
      expect(asignacionRepo.items.get(1).fechaDevolucion).toBeNull();

      // El estado físico del agrupador y artículo no cambia a DISPONIBLE porque queda el empleado 8
      expect(agrupadorRepo.savedWith).toHaveLength(0); // no se re-guardó como DISPONIBLE
      expect(articuloRepo.savedWith).toHaveLength(0); // no se re-guardó como DISPONIBLE
    });

    it('al devolver el ÚLTIMO responsable, el agrupador y artículos vuelven a DISPONIBLE', async () => {
      agrupadorRepo.seed({
        id: 10, estado: 'ASIGNADO',
        tipoAgrupador: { asignable: true, multiAsignable: true },
        articulos: [
          { id: 1, estado: { codigo: 'EN_USO' } },
        ],
      });
      // Empleado 7 es el único asignado
      asignacionAgrupadorRepo.seed({ id: 2, agrupadorId: 10, empleadoId: 7 });
      asignacionRepo.seed({ id: 2, articuloId: 1, empleadoId: 7 });

      // Devuelve su asignación
      await service.devolverAgrupador(2);

      // Su asignación se cierra
      expect(asignacionAgrupadorRepo.items.get(2).fechaDevolucion).toBeInstanceOf(Date);
      expect(asignacionRepo.items.get(2).fechaDevolucion).toBeInstanceOf(Date);

      // Vuelven a DISPONIBLE al ser la última
      expect(agrupadorRepo.savedWith[0].estado).toBe('DISPONIBLE');
      expect(articuloRepo.savedWith[0].estadoCodigo).toBe('DISPONIBLE');
    });
  });
});
