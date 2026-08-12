import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@inventory-system/backend-persistence';
import { CreateAspectoDto, CreateChecklistDto } from './dto/checklists.dto';

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- ASPECTOS ---
  async getAspectos(dominioId: number) {
    return this.prisma.aspectoChecklist.findMany({
      where: { dominioId },
      orderBy: { nombre: 'asc' }
    });
  }

  async createAspecto(dominioId: number, dto: CreateAspectoDto) {
    const nombreNormalizado = dto.nombre.trim();
    if (!nombreNormalizado) {
      throw new BadRequestException('El nombre del aspecto no puede estar vacío.');
    }

    // Check for duplicates in the same domain
    const existing = await this.prisma.aspectoChecklist.findFirst({
      where: {
        nombre: {
          equals: nombreNormalizado,
          mode: 'insensitive'
        },
        dominioId
      }
    });

    if (existing) {
      throw new BadRequestException('Ya existe un aspecto con ese nombre en este dominio.');
    }

    return this.prisma.aspectoChecklist.create({
      data: {
        nombre: nombreNormalizado,
        dominioId
      }
    });
  }

  async deleteAspecto(id: number) {
    const Aspecto = await this.prisma.aspectoChecklist.findUnique({
      where: { id }
    });
    if (!Aspecto) {
      throw new NotFoundException('Aspecto no encontrado.');
    }
    return this.prisma.aspectoChecklist.delete({
      where: { id }
    });
  }

  // --- CHECKLISTS ---
  async getChecklists(filters: { dominioId?: number; categoriaId?: number; tipoAgrupadorId?: number; ambito?: string }) {
    const where: any = {};
    
    if (filters.dominioId) {
      where.aspecto = { dominioId: filters.dominioId };
    }

    if (filters.ambito) {
      where.ambito = filters.ambito;
    }
    
    if (filters.categoriaId) {
      where.categoriaId = filters.categoriaId;
    }
    
    if (filters.tipoAgrupadorId) {
      where.tipoAgrupadorId = filters.tipoAgrupadorId;
    }

    return this.prisma.checklist.findMany({
      where,
      include: {
        aspecto: true,
        items: {
          orderBy: { orden: 'asc' }
        },
        categoria: {
          select: {
            id: true,
            nombre: true
          }
        },
        tipoAgrupador: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createChecklist(dto: CreateChecklistDto) {
    const aspecto = await this.prisma.aspectoChecklist.findUnique({
      where: { id: dto.aspectoId }
    });
    if (!aspecto) {
      throw new NotFoundException('Aspecto de checklist no encontrado.');
    }

    if (aspecto.dominioId !== dto.dominioId) {
      throw new BadRequestException('El aspecto seleccionado no pertenece al dominio especificado.');
    }

    const isArticulo = dto.ambito === 'ARTICULO';
    const categoriaId = isArticulo ? (dto.categoriaId || null) : null;
    const tipoAgrupadorId = !isArticulo ? (dto.tipoAgrupadorId || null) : null;

    if (categoriaId) {
      const cat = await this.prisma.categoria.findUnique({ where: { id: categoriaId } });
      if (!cat) {
        throw new NotFoundException('La categoría especificada no existe.');
      }
      if (cat.dominioId !== dto.dominioId) {
        throw new BadRequestException('La categoría no pertenece al dominio especificado.');
      }
    }

    if (tipoAgrupadorId) {
      const ta = await this.prisma.tipoAgrupador.findUnique({ where: { id: tipoAgrupadorId } });
      if (!ta) {
        throw new NotFoundException('El tipo de agrupador especificado no existe.');
      }
      if (ta.dominioId !== dto.dominioId) {
        throw new BadRequestException('El tipo de agrupador no pertenece al dominio especificado.');
      }
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El checklist debe contener al menos un ítem o pregunta.');
    }

    return this.prisma.checklist.create({
      data: {
        titulo: dto.titulo.trim(),
        aspectoId: dto.aspectoId,
        ambito: dto.ambito,
        categoriaId,
        tipoAgrupadorId,
        items: {
          create: dto.items.map(item => ({
            pregunta: item.pregunta.trim(),
            orden: item.orden
          }))
        }
      },
      include: {
        aspecto: true,
        items: {
          orderBy: { orden: 'asc' }
        }
      }
    });
  }

  async updateChecklist(id: number, dto: CreateChecklistDto) {
    const existing = await this.prisma.checklist.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new NotFoundException('Checklist no encontrado.');
    }

    const aspecto = await this.prisma.aspectoChecklist.findUnique({
      where: { id: dto.aspectoId }
    });
    if (!aspecto) {
      throw new NotFoundException('Aspecto de checklist no encontrado.');
    }

    if (aspecto.dominioId !== dto.dominioId) {
      throw new BadRequestException('El aspecto seleccionado no pertenece al dominio especificado.');
    }

    const isArticulo = dto.ambito === 'ARTICULO';
    const categoriaId = isArticulo ? (dto.categoriaId || null) : null;
    const tipoAgrupadorId = !isArticulo ? (dto.tipoAgrupadorId || null) : null;

    if (categoriaId) {
      const cat = await this.prisma.categoria.findUnique({ where: { id: categoriaId } });
      if (!cat) {
        throw new NotFoundException('La categoría especificada no existe.');
      }
      if (cat.dominioId !== dto.dominioId) {
        throw new BadRequestException('La categoría no pertenece al dominio especificado.');
      }
    }

    if (tipoAgrupadorId) {
      const ta = await this.prisma.tipoAgrupador.findUnique({ where: { id: tipoAgrupadorId } });
      if (!ta) {
        throw new NotFoundException('El tipo de agrupador especificado no existe.');
      }
      if (ta.dominioId !== dto.dominioId) {
        throw new BadRequestException('El tipo de agrupador no pertenece al dominio especificado.');
      }
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El checklist debe contener al menos un ítem o pregunta.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete all existing items of this checklist
      await tx.checklistItem.deleteMany({
        where: { checklistId: id }
      });

      // 2. Update the checklist parent record and recreate items
      return tx.checklist.update({
        where: { id },
        data: {
          titulo: dto.titulo.trim(),
          aspectoId: dto.aspectoId,
          ambito: dto.ambito,
          categoriaId,
          tipoAgrupadorId,
          items: {
            create: dto.items.map(item => ({
              pregunta: item.pregunta.trim(),
              orden: item.orden
            }))
          }
        },
        include: {
          aspecto: true,
          items: {
            orderBy: { orden: 'asc' }
          }
        }
      });
    });
  }

  async deleteChecklist(id: number) {
    const ch = await this.prisma.checklist.findUnique({ where: { id } });
    if (!ch) {
      throw new NotFoundException('Checklist no encontrado.');
    }
    return this.prisma.checklist.delete({ where: { id } });
  }

  // --- INSTANCIAS ---
  async getChecklistInstancias(filters: {
    articuloId?: number;
    agrupadorId?: number;
    dominioId?: number;
    checklistId?: number;
    responsable?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const where: any = {};
    if (filters.articuloId) {
      where.articuloId = filters.articuloId;
    }
    if (filters.agrupadorId) {
      where.agrupadorId = filters.agrupadorId;
    }
    if (filters.checklistId) {
      where.checklistId = filters.checklistId;
    }
    if (filters.responsable && filters.responsable.trim()) {
      where.responsable = {
        contains: filters.responsable,
        mode: 'insensitive'
      };
    }
    if (filters.fechaDesde || filters.fechaHasta) {
      where.createdAt = {};
      if (filters.fechaDesde) {
        where.createdAt.gte = new Date(filters.fechaDesde);
      }
      if (filters.fechaHasta) {
        const dateLimit = new Date(filters.fechaHasta);
        dateLimit.setHours(23, 59, 59, 999);
        where.createdAt.lte = dateLimit;
      }
    }

    if (filters.dominioId && !filters.checklistId) {
      where.checklist = {
        aspecto: { dominioId: filters.dominioId }
      };
    }

    return this.prisma.checklistInstancia.findMany({
      where,
      include: {
        checklist: {
          include: {
            aspecto: true
          }
        },
        articulo: {
          include: {
            modelo: {
              include: {
                categoria: true,
                marca: true
              }
            }
          }
        },
        agrupador: {
          include: {
            tipoAgrupador: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getChecklistInstanciaById(id: number) {
    const inst = await this.prisma.checklistInstancia.findUnique({
      where: { id },
      include: {
        checklist: {
          include: {
            aspecto: true
          }
        },
        valores: {
          include: {
            checklistItem: true
          },
          orderBy: {
            checklistItem: { orden: 'asc' }
          }
        }
      }
    });

    if (!inst) {
      throw new NotFoundException('Instancia de checklist no encontrada.');
    }
    return inst;
  }

  async createChecklistInstancia(dto: any) {
    const ch = await this.prisma.checklist.findUnique({
      where: { id: dto.checklistId }
    });
    if (!ch) {
      throw new NotFoundException('Checklist no encontrado.');
    }

    return this.prisma.$transaction(async (tx) => {
      return tx.checklistInstancia.create({
        data: {
          checklistId: dto.checklistId,
          articuloId: dto.articuloId || null,
          agrupadorId: dto.agrupadorId || null,
          observaciones: dto.observaciones?.trim() || null,
          responsable: dto.responsable?.trim() || null,
          valores: {
            create: dto.valores.map((val: any) => ({
              checklistItemId: val.checklistItemId,
              valor: val.valor,
              observacion: val.observacion?.trim() || null
            }))
          }
        },
        include: {
          valores: true
        }
      });
    });
  }
}
