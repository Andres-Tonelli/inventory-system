import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { InMemoryRepo, InMemoryEstadoRepo } from './testing/fakes';

describe('CatalogosService', () => {
  let dominioRepo: InMemoryRepo<any>;
  let categoriaRepo: InMemoryRepo<any>;
  let marcaRepo: InMemoryRepo<any>;
  let modeloRepo: InMemoryRepo<any>;
  let atributoRepo: InMemoryRepo<any>;
  let tipoAgrupadorRepo: InMemoryRepo<any>;
  let estadoRepo: InMemoryEstadoRepo;
  let service: CatalogosService;

  beforeEach(() => {
    dominioRepo = new InMemoryRepo();
    categoriaRepo = new InMemoryRepo();
    marcaRepo = new InMemoryRepo();
    modeloRepo = new InMemoryRepo();
    atributoRepo = new InMemoryRepo();
    tipoAgrupadorRepo = new InMemoryRepo();
    estadoRepo = new InMemoryEstadoRepo();
    service = new CatalogosService(
      dominioRepo as any,
      categoriaRepo as any,
      marcaRepo as any,
      modeloRepo as any,
      atributoRepo as any,
      tipoAgrupadorRepo as any,
      estadoRepo as any,
    );
  });

  describe('updateDominio (patch parcial, ADR-0008)', () => {
    it('NO pisa icono/color cuando el caller no los envía', async () => {
      dominioRepo.seed({ id: 1, nombre: 'Informática', icono: 'desktop', color: 'blue' });

      await service.updateDominio(1, { nombre: 'IT' });

      // El patch no incluye las claves ausentes...
      expect('icono' in dominioRepo.savedWith[0]).toBe(false);
      expect('color' in dominioRepo.savedWith[0]).toBe(false);
      // ...y la identidad visual sobrevive al rename.
      expect(dominioRepo.items.get(1)).toMatchObject({ nombre: 'IT', icono: 'desktop', color: 'blue' });
    });

    it('actualiza icono/color cuando sí vienen', async () => {
      dominioRepo.seed({ id: 1, nombre: 'X', icono: 'box', color: 'indigo' });
      await service.updateDominio(1, { nombre: 'X', icono: 'car', color: 'teal' });
      expect(dominioRepo.items.get(1)).toMatchObject({ icono: 'car', color: 'teal' });
    });
  });

  describe('deleteDominio', () => {
    it('traduce el error de persistencia (FK) a un 400 amistoso', async () => {
      // El fake tira al borrar un id inexistente: simula la FK violada de Prisma.
      await expect(service.deleteDominio(99)).rejects.toThrow(BadRequestException);
      await expect(service.deleteDominio(99)).rejects.toThrow(/tiene categorías/i);
    });
  });

  describe('createEstado (derivación del código estable, ADR-0004 D4)', () => {
    it.each([
      ['Para reparación', 'PARA_REPARACION'],
      ['Fuera de uso/Roto', 'FUERA_DE_USO_ROTO'],
      ['  En tránsito  ', 'EN_TRANSITO'],
      ['Añejado', 'ANEJADO'],
    ])('deriva "%s" → "%s"', async (nombre, esperado) => {
      await service.createEstado(nombre);
      expect(estadoRepo.creados.at(-1)?.codigo).toBe(esperado);
    });

    it('respeta un código explícito si se lo pasan', async () => {
      await service.createEstado('Prestado a terceros', 'PRESTAMO');
      expect(estadoRepo.creados.at(-1)).toEqual({ nombre: 'Prestado a terceros', codigo: 'PRESTAMO' });
    });
  });

  describe('createTipoAgrupador (flag asignable, ADR-0004 D3)', () => {
    it('sin asignable explícito no manda la clave (la base pone el default true)', async () => {
      await service.createTipoAgrupador({ nombre: 'Kit', dominioId: 1 });
      expect('asignable' in tipoAgrupadorRepo.savedWith[0]).toBe(false);
    });

    it('respeta asignable=false (contenedor/ubicación)', async () => {
      await service.createTipoAgrupador({ nombre: 'Locker', dominioId: 1, asignable: false });
      expect(tipoAgrupadorRepo.savedWith[0].asignable).toBe(false);
    });
  });

  describe('updateModelo (edición del catálogo del dominio)', () => {
    it('sólo persiste los campos presentes', async () => {
      modeloRepo.seed({ id: 1, nombre: 'M90', marcaId: 4, categoriaId: 2 });
      await service.updateModelo(1, { nombre: 'M90 v2' });
      expect(modeloRepo.savedWith[0]).toEqual({ id: 1, nombre: 'M90 v2' });
      expect(modeloRepo.items.get(1)).toMatchObject({ marcaId: 4, categoriaId: 2 });
    });
  });
});
