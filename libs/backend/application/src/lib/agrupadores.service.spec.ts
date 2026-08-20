import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AgrupadoresService } from './agrupadores.service';
import { fakeUow, InMemoryRepo } from './testing/fakes';

/** Contención de artículos y jerarquía de agrupadores (ADR-0004 D2). */
describe('AgrupadoresService', () => {
  let agrupadorRepo: InMemoryRepo<any>;
  let articuloRepo: InMemoryRepo<any>;
  let asignacionRepo: InMemoryRepo<any>;
  let asignacionAgrupadorRepo: InMemoryRepo<any>;
  let service: AgrupadoresService;

  beforeEach(() => {
    agrupadorRepo = new InMemoryRepo();
    articuloRepo = new InMemoryRepo();
    asignacionRepo = new InMemoryRepo();
    asignacionAgrupadorRepo = new InMemoryRepo();
    service = new AgrupadoresService(
      fakeUow() as any,
      agrupadorRepo as any,
      articuloRepo as any,
      asignacionRepo as any,
      asignacionAgrupadorRepo as any
    );
  });

  describe('addArticulo (vincular a un agrupador)', () => {
    it('rechaza un artículo EN_USO (está entregado a una persona)', async () => {
      agrupadorRepo.seed({ id: 10, estado: 'DISPONIBLE' });
      articuloRepo.seed({ id: 1, estado: { codigo: 'EN_USO' } });
      await expect(service.addArticulo(10, 1)).rejects.toThrow(BadRequestException);
    });

    it('contención pura: setea agrupadorId y NO cambia el estado (condición) del artículo si el agrupador está disponible', async () => {
      agrupadorRepo.seed({ id: 10, estado: 'DISPONIBLE' });
      articuloRepo.seed({ id: 1, estado: { codigo: 'DISPONIBLE' }, agrupadorId: null });

      await service.addArticulo(10, 1);

      expect(articuloRepo.items.get(1).agrupadorId).toBe(10);
      // El save NO debe escribir estadoCodigo: contención ≠ asignación (D2).
      expect(articuloRepo.savedWith[0].estadoCodigo).toBeUndefined();
    });

    it('si se agrega un artículo a un agrupador ASIGNADO, el artículo pasa a EN_USO y se crea su asignación', async () => {
      agrupadorRepo.seed({ id: 10, estado: 'ASIGNADO' });
      articuloRepo.seed({ id: 1, estado: { codigo: 'DISPONIBLE' }, agrupadorId: null });
      asignacionAgrupadorRepo.seed({ id: 100, agrupadorId: 10, empleadoId: 7, fechaDevolucion: null });

      await service.addArticulo(10, 1);

      expect(articuloRepo.items.get(1).agrupadorId).toBe(10);
      expect(articuloRepo.savedWith[0].estadoCodigo).toBe('EN_USO');
      expect([...asignacionRepo.items.values()][0]).toMatchObject({ articuloId: 1, empleadoId: 7 });
    });
  });

  describe('removeArticulo (desvincular)', () => {
    it('limpia agrupadorId y por defecto cambia estado a DISPONIBLE', async () => {
      articuloRepo.seed({ id: 1, estado: { codigo: 'EN_USO' }, agrupadorId: 10 });
      await service.removeArticulo(1);
      expect(articuloRepo.items.get(1).agrupadorId).toBeNull();
      expect(articuloRepo.savedWith[0].estadoCodigo).toBe('DISPONIBLE');
    });

    it('limpia agrupadorId y permite especificar un estado destino personalizado', async () => {
      articuloRepo.seed({ id: 1, estado: { codigo: 'EN_USO' }, agrupadorId: 10 });
      await service.removeArticulo(1, 'EN_REPARACION');
      expect(articuloRepo.items.get(1).agrupadorId).toBeNull();
      expect(articuloRepo.savedWith[0].estadoCodigo).toBe('EN_REPARACION');
    });
  });

  describe('addSubAgrupador (jerarquía)', () => {
    it('rechaza que un agrupador sea sub-agrupador de sí mismo', async () => {
      agrupadorRepo.seed({ id: 1, agrupadorPadreId: null });
      await expect(service.addSubAgrupador(1, 1)).rejects.toThrow(/sí mismo/i);
    });

    it('detecta dependencias circulares subiendo por la cadena de padres', async () => {
      agrupadorRepo.seed({ id: 1, agrupadorPadreId: null }, { id: 2, agrupadorPadreId: null });

      await service.addSubAgrupador(1, 2); // B dentro de A
      expect(agrupadorRepo.items.get(2).agrupadorPadreId).toBe(1);

      // A dentro de B cerraría el ciclo A→B→A.
      await expect(service.addSubAgrupador(2, 1)).rejects.toThrow(/circular/i);
    });

    it('detecta ciclos indirectos (A→B→C, luego C como padre de A)', async () => {
      agrupadorRepo.seed(
        { id: 1, agrupadorPadreId: null },
        { id: 2, agrupadorPadreId: null },
        { id: 3, agrupadorPadreId: null },
      );
      await service.addSubAgrupador(1, 2); // B dentro de A
      await service.addSubAgrupador(2, 3); // C dentro de B

      await expect(service.addSubAgrupador(3, 1)).rejects.toThrow(/circular/i);
    });
  });

  describe('removeSubAgrupador', () => {
    it('desengancha el hijo de su padre', async () => {
      agrupadorRepo.seed({ id: 2, agrupadorPadreId: 1 });
      await service.removeSubAgrupador(2);
      expect(agrupadorRepo.items.get(2).agrupadorPadreId).toBeNull();
    });
  });

  describe('multiAsignacion addArticulo y addSubAgrupador', () => {
    it('al agregar un artículo a un agrupador con múltiples responsables, asigna el artículo a todos ellos', async () => {
      agrupadorRepo.seed({
        id: 10, estado: 'ASIGNADO',
        tipoAgrupador: { asignable: true, multiAsignable: true }
      });
      articuloRepo.seed({ id: 5, estado: { codigo: 'DISPONIBLE' }, agrupadorId: null });

      // Empleado 8 y Empleado 7 están asignados
      asignacionAgrupadorRepo.seed(
        { id: 1, agrupadorId: 10, empleadoId: 8 },
        { id: 2, agrupadorId: 10, empleadoId: 7 }
      );

      await service.addArticulo(10, 5);

      // El artículo se debió asignar a ambos empleados
      const allArtAsgs = [...asignacionRepo.items.values()];
      expect(allArtAsgs).toHaveLength(2);
      expect(allArtAsgs.some(a => a.articuloId === 5 && a.empleadoId === 8)).toBe(true);
      expect(allArtAsgs.some(a => a.articuloId === 5 && a.empleadoId === 7)).toBe(true);
      expect(articuloRepo.items.get(5).estadoCodigo).toBe('EN_USO');
    });
  });
});
