import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SolicitudesService } from '../../../../../apps/backend/src/app/solicitudes/solicitudes.service';

describe('SolicitudesService', () => {
  let service: SolicitudesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      solicitud: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      articulo: {
        update: vi.fn(),
      },
      asignacionArticulo: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
      },
      asignacionAgrupador: {
        findFirst: vi.fn(),
      },
      estadoArticulo: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    service = new SolicitudesService(mockPrisma);
  });

  describe('create', () => {
    it('crea una solicitud de insumo (ESCASEZ) correctamente', async () => {
      const mockResult = { id: 1, tipo: 'ESCASEZ', cantidad: 5 };
      mockPrisma.solicitud.create.mockResolvedValue(mockResult);

      const res = await service.create(10, {
        tipo: 'ESCASEZ',
        dominioId: 1,
        categoriaId: 2,
        cantidad: 5,
        motivo: 'Faltan insumos de limpieza',
      });

      expect(res).toEqual(mockResult);
      expect(mockPrisma.solicitud.create).toHaveBeenCalledWith({
        data: {
          tipo: 'ESCASEZ',
          estado: 'PENDIENTE',
          empleadoId: 10,
          dominioId: 1,
          articuloId: null,
          categoriaId: 2,
          modeloId: null,
          cantidad: 5,
          fechaInicio: null,
          fechaFin: null,
          titulo: null,
          motivo: 'Faltan insumos de limpieza',
        },
        include: {
          empleado: { select: { nombre: true, legajo: true } },
          dominio: true,
          articulo: { include: { modelo: true } },
          categoria: true,
          modelo: true,
        },
      });
    });

    it('crea una solicitud GENERAL correctamente', async () => {
      const mockResult = { id: 3, tipo: 'GENERAL', titulo: 'Arreglar inodoro' };
      mockPrisma.solicitud.create.mockResolvedValue(mockResult);

      const res = await service.create(10, {
        tipo: 'GENERAL',
        titulo: 'Arreglar inodoro',
        motivo: 'Pierde agua por la base',
      });

      expect(res).toEqual(mockResult);
      expect(mockPrisma.solicitud.create).toHaveBeenCalledWith({
        data: {
          tipo: 'GENERAL',
          estado: 'PENDIENTE',
          empleadoId: 10,
          dominioId: null,
          articuloId: null,
          categoriaId: null,
          modeloId: null,
          cantidad: 1,
          fechaInicio: null,
          fechaFin: null,
          titulo: 'Arreglar inodoro',
          motivo: 'Pierde agua por la base',
        },
        include: {
          empleado: { select: { nombre: true, legajo: true } },
          dominio: true,
          articulo: { include: { modelo: true } },
          categoria: true,
          modelo: true,
        },
      });
    });

    it('falla al crear una solicitud GENERAL si no se especifica el concepto/titulo', async () => {
      await expect(
        service.create(10, {
          tipo: 'GENERAL',
          motivo: 'Pierde agua por la base',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('falla si es ROTURA pero el artículo no está asignado', async () => {
      mockPrisma.asignacionArticulo.findFirst.mockResolvedValue(null);
      mockPrisma.asignacionAgrupador.findFirst.mockResolvedValue(null);

      await expect(
        service.create(10, {
          tipo: 'ROTURA',
          dominioId: 1,
          articuloId: 99,
          motivo: 'Pantalla rota',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('permite reportar ROTURA si está asignado directamente', async () => {
      mockPrisma.asignacionArticulo.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.solicitud.create.mockResolvedValue({ id: 2, tipo: 'ROTURA' });

      const res = await service.create(10, {
        tipo: 'ROTURA',
        dominioId: 1,
        articuloId: 99,
        motivo: 'Pantalla rota',
      });

      expect(res.tipo).toBe('ROTURA');
    });
  });

  describe('resolver', () => {
    it('falla si la solicitud no existe', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValue(null);

      await expect(
        service.resolver(1, { rol: 'SISTEMA' }, { estado: 'APROBADA' })
      ).rejects.toThrow(NotFoundException);
    });

    it('actualiza el estado del artículo e inactiva su asignación al aprobar ROTURA', async () => {
      const mockSolicitud = {
        id: 1,
        tipo: 'ROTURA',
        articuloId: 100,
        dominioId: 2,
      };
      mockPrisma.solicitud.findUnique.mockResolvedValue(mockSolicitud);
      mockPrisma.estadoArticulo.findUnique.mockResolvedValue({ id: 3, codigo: 'ROTO' });
      mockPrisma.solicitud.update.mockResolvedValue({ ...mockSolicitud, estado: 'APROBADA' });

      const res = await service.resolver(
        1,
        { rol: 'SISTEMA' },
        { estado: 'APROBADA', nuevoEstadoArticuloCodigo: 'ROTO' }
      );

      expect(res.estado).toBe('APROBADA');
      expect(mockPrisma.articulo.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { estadoId: 3 },
      });
      expect(mockPrisma.asignacionArticulo.updateMany).toHaveBeenCalledWith({
        where: { articuloId: 100, fechaDevolucion: null },
        data: {
          fechaDevolucion: expect.any(Date),
          observaciones: expect.stringContaining('Devolución automática'),
        },
      });
    });
  });
});
