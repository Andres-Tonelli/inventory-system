import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { InMemoryRepo, InMemoryLoteRepo, InMemoryEstadoRepo } from './testing/fakes';

/** Estados por código estable (ADR-0004 D4) y stock atómico (A2). */
describe('InventarioService', () => {
  let articuloRepo: InMemoryRepo<any>;
  let loteRepo: InMemoryLoteRepo;
  let estadoRepo: InMemoryEstadoRepo;
  let service: InventarioService;

  beforeEach(() => {
    articuloRepo = new InMemoryRepo();
    loteRepo = new InMemoryLoteRepo();
    estadoRepo = new InMemoryEstadoRepo();
    service = new InventarioService(articuloRepo as any, loteRepo as any, estadoRepo as any);
  });

  describe('cambiarEstadoArticulo (cambio manual de estado)', () => {
    it('rechaza un artículo inexistente', async () => {
      await expect(service.cambiarEstadoArticulo(99, 'BAJA')).rejects.toThrow(/no encontrado/i);
    });

    it('valida el código contra la tabla de estados (nada de valores mágicos)', async () => {
      articuloRepo.seed({ id: 1 });
      await expect(service.cambiarEstadoArticulo(1, 'ROTO_MAL')).rejects.toThrow(/Estado inválido/i);
    });

    it('camino feliz: persiste {id, estadoCodigo} y deja la resolución a id en la persistencia', async () => {
      articuloRepo.seed({ id: 1 });
      await service.cambiarEstadoArticulo(1, 'EN_REPARACION');
      expect(articuloRepo.savedWith[0]).toMatchObject({ id: 1, estadoCodigo: 'EN_REPARACION' });
    });
  });

  describe('actualizarArticulo (corrección de datos, sin tocar estado)', () => {
    it('rechaza un artículo inexistente', async () => {
      await expect(service.actualizarArticulo(99, { alias: 'x' })).rejects.toThrow(/no encontrado/i);
    });

    it('traduce la violación de unicidad de nroSerie (P2002) a un 400 legible', async () => {
      articuloRepo.seed({ id: 1, nroSerie: 'A' });
      articuloRepo.save = async () => {
        throw Object.assign(new Error('unique'), { code: 'P2002' });
      };
      await expect(service.actualizarArticulo(1, { nroSerie: 'B' })).rejects.toThrow(/nº de serie/i);
    });

    it('camino feliz: guarda sólo los datos editados, nunca estadoCodigo', async () => {
      articuloRepo.seed({ id: 1, alias: 'viejo' });
      await service.actualizarArticulo(1, { alias: 'nuevo', detalle: 'nota' });
      expect(articuloRepo.savedWith[0]).toMatchObject({ id: 1, alias: 'nuevo', detalle: 'nota' });
      expect(articuloRepo.savedWith[0].estadoCodigo).toBeUndefined();
    });
  });

  describe('consumirLote / adicionarStock (stock atómico, REVISION A2)', () => {
    it('rechaza cantidades <= 0 en ambas operaciones', async () => {
      await expect(service.consumirLote(1, 0)).rejects.toThrow(BadRequestException);
      await expect(service.adicionarStock(1, -3)).rejects.toThrow(BadRequestException);
    });

    it('consumir más que lo disponible falla SIN modificar el stock', async () => {
      loteRepo.seed({ id: 1, cantidadDisponible: 5 });
      await expect(service.consumirLote(1, 8)).rejects.toThrow(/supera el stock/i);
      expect(loteRepo.items.get(1).cantidadDisponible).toBe(5);
    });

    it('distingue "lote inexistente" de "stock insuficiente"', async () => {
      await expect(service.consumirLote(99, 1)).rejects.toThrow(/Lote no encontrado/i);
    });

    it('camino feliz: consume y adiciona', async () => {
      loteRepo.seed({ id: 1, cantidadDisponible: 10 });
      await service.consumirLote(1, 4);
      expect(loteRepo.items.get(1).cantidadDisponible).toBe(6);
      await service.adicionarStock(1, 3);
      expect(loteRepo.items.get(1).cantidadDisponible).toBe(9);
    });
  });

  describe('createLote (trazabilidad del ingreso, ADR-0004 D6)', () => {
    it('registra cantidadInicial a partir de lo ingresado', async () => {
      await service.createLote({ modeloId: 3, cantidadDisponible: 25 });
      expect(loteRepo.savedWith[0]).toMatchObject({ modeloId: 3, cantidadDisponible: 25, cantidadInicial: 25 });
    });
  });
});
