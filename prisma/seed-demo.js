const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting demo database seeding...");

  // 1. Areas
  const adminArea = await prisma.area.upsert({
    where: { nombre: 'Administración' },
    update: {},
    create: { nombre: 'Administración' },
  });

  const sistemasArea = await prisma.area.upsert({
    where: { nombre: 'Sistemas' },
    update: {},
    create: { nombre: 'Sistemas' },
  });

  // 2. Employees (Administrators and Collaborators)
  const empAdmin = await prisma.empleado.upsert({
    where: { legajo: 'admin' },
    update: {},
    create: {
      legajo: 'admin',
      nombre: 'Administrador TagSA',
      areaId: adminArea.id
    }
  });

  const empJohn = await prisma.empleado.upsert({
    where: { legajo: 'atonelli' },
    update: { nombre: 'Andres Tonelli' },
    create: {
      legajo: 'atonelli',
      nombre: 'Andres Tonelli',
      areaId: sistemasArea.id
    }
  });

  const empJane = await prisma.empleado.upsert({
    where: { legajo: 'jsmith' },
    update: {},
    create: {
      legajo: 'jsmith',
      nombre: 'Jane Smith',
      areaId: adminArea.id
    }
  });

  // 2b. Register atonelli as System Administrator
  await prisma.administrador.upsert({
    where: { username: 'atonelli' },
    update: { rol: 'SISTEMA', nombre: 'Andres Tonelli' },
    create: {
      username: 'atonelli',
      nombre: 'Andres Tonelli',
      rol: 'SISTEMA'
    }
  });

  // 3. Dominios
  const domInfo = await prisma.dominioInventario.upsert({
    where: { nombre: 'Informática' },
    update: { icono: 'desktop', color: '#6366f1' },
    create: { nombre: 'Informática', icono: 'desktop', color: '#6366f1' },
  });
  
  const domLibreria = await prisma.dominioInventario.upsert({
    where: { nombre: 'Librería' },
    update: { icono: 'book', color: '#f59e0b' },
    create: { nombre: 'Librería', icono: 'book', color: '#f59e0b' },
  });
  
  const domEPP = await prisma.dominioInventario.upsert({
    where: { nombre: 'EPP' },
    update: { icono: 'shield', color: '#10b981' },
    create: { nombre: 'EPP', icono: 'shield', color: '#10b981' },
  });

  // 4. Estados de artículo para cada dominio
  const domains = [domInfo, domLibreria, domEPP];
  const estadosPorDominio = {};

  for (const d of domains) {
    const estadosBase = [
      { codigo: 'DISPONIBLE', nombre: 'Disponible' },
      { codigo: 'EN_USO', nombre: 'En uso' },
      { codigo: 'ROTO', nombre: 'Roto / Dañado' },
      { codigo: 'REPARACION', nombre: 'En Reparación' },
    ];
    estadosPorDominio[d.id] = {};
    for (const e of estadosBase) {
      const dbEstado = await prisma.estadoArticulo.upsert({
        where: {
          codigo_dominioId: {
            codigo: e.codigo,
            dominioId: d.id,
          },
        },
        update: { nombre: e.nombre },
        create: {
          codigo: e.codigo,
          nombre: e.nombre,
          dominioId: d.id,
        },
      });
      estadosPorDominio[d.id][e.codigo] = dbEstado;
    }
  }

  // 5. Categorías
  const catNotebooks = await prisma.categoria.upsert({
    where: { nombre_dominioId: { nombre: 'Notebooks', dominioId: domInfo.id } },
    update: {},
    create: { nombre: 'Notebooks', tipoSeguimiento: 'UNITARIO', dominioId: domInfo.id }
  });
  const catMonitores = await prisma.categoria.upsert({
    where: { nombre_dominioId: { nombre: 'Monitores', dominioId: domInfo.id } },
    update: {},
    create: { nombre: 'Monitores', tipoSeguimiento: 'UNITARIO', dominioId: domInfo.id }
  });
  const catConsumibles = await prisma.categoria.upsert({
    where: { nombre_dominioId: { nombre: 'Resmas A4', dominioId: domLibreria.id } },
    update: {},
    create: { nombre: 'Resmas A4', tipoSeguimiento: 'POR_LOTE', dominioId: domLibreria.id }
  });
  const catLibreriaGral = await prisma.categoria.upsert({
    where: { nombre_dominioId: { nombre: 'Artículos de Escritorio', dominioId: domLibreria.id } },
    update: {},
    create: { nombre: 'Artículos de Escritorio', tipoSeguimiento: 'POR_LOTE', dominioId: domLibreria.id }
  });
  const catCalzado = await prisma.categoria.upsert({
    where: { nombre_dominioId: { nombre: 'Calzado de Seguridad', dominioId: domEPP.id } },
    update: {},
    create: { nombre: 'Calzado de Seguridad', tipoSeguimiento: 'UNITARIO', dominioId: domEPP.id }
  });

  // 6. Marcas
  const marcaDell = await prisma.marca.upsert({
    where: { nombre_dominioId: { nombre: 'Dell', dominioId: domInfo.id } },
    update: {},
    create: { nombre: 'Dell', dominioId: domInfo.id }
  });
  const marcaSamsung = await prisma.marca.upsert({
    where: { nombre_dominioId: { nombre: 'Samsung', dominioId: domInfo.id } },
    update: {},
    create: { nombre: 'Samsung', dominioId: domInfo.id }
  });
  const marcaKamet = await prisma.marca.upsert({
    where: { nombre_dominioId: { nombre: 'Kamet', dominioId: domEPP.id } },
    update: {},
    create: { nombre: 'Kamet', dominioId: domEPP.id }
  });

  // 7. Modelos
  const modLatitude = await prisma.modelo.upsert({
    where: { nombre_marcaId_categoriaId: { nombre: 'Latitude 3520', marcaId: marcaDell.id, categoriaId: catNotebooks.id } },
    update: {},
    create: {
      nombre: 'Latitude 3520',
      marcaId: marcaDell.id,
      categoriaId: catNotebooks.id,
      atributos: {
        "Procesador": "Intel Core i5",
        "RAM": "16 GB",
        "Almacenamiento": "512 GB SSD"
      }
    }
  });

  const modMonitor24 = await prisma.modelo.upsert({
    where: { nombre_marcaId_categoriaId: { nombre: 'Essential Monitor 24"', marcaId: marcaSamsung.id, categoriaId: catMonitores.id } },
    update: {},
    create: {
      nombre: 'Essential Monitor 24"',
      marcaId: marcaSamsung.id,
      categoriaId: catMonitores.id,
      atributos: {
        "Resolución": "1920x1080 FHD",
        "Frecuencia": "75Hz"
      }
    }
  });

  const modZapatoKamet = await prisma.modelo.upsert({
    where: { nombre_marcaId_categoriaId: { nombre: 'Zapatos Borceguí Cobra', marcaId: marcaKamet.id, categoriaId: catCalzado.id } },
    update: {},
    create: {
      nombre: 'Zapatos Borceguí Cobra',
      marcaId: marcaKamet.id,
      categoriaId: catCalzado.id,
      atributos: {
        "Puntera": "Acero",
        "Dieléctrico": "Sí"
      }
    }
  });

  // 8. Artículos e inventario físico
  const artNotebook1 = await prisma.articulo.upsert({
    where: { nroSerie: 'DELL-SN-100234' },
    update: {},
    create: {
      nroSerie: 'DELL-SN-100234',
      alias: 'Notebook Desarrollo John',
      modeloId: modLatitude.id,
      estadoId: estadosPorDominio[domInfo.id]['EN_USO'].id,
    }
  });

  const artNotebook2 = await prisma.articulo.upsert({
    where: { nroSerie: 'DELL-SN-100235' },
    update: {},
    create: {
      nroSerie: 'DELL-SN-100235',
      alias: 'Notebook BackUp IT',
      modeloId: modLatitude.id,
      estadoId: estadosPorDominio[domInfo.id]['DISPONIBLE'].id,
    }
  });

  const artMonitor1 = await prisma.articulo.upsert({
    where: { nroSerie: 'SAMS-SN-400921' },
    update: {},
    create: {
      nroSerie: 'SAMS-SN-400921',
      alias: 'Monitor Principal John',
      modeloId: modMonitor24.id,
      estadoId: estadosPorDominio[domInfo.id]['EN_USO'].id,
    }
  });

  const artZapatosJane = await prisma.articulo.upsert({
    where: { nroSerie: 'KAMET-SN-8822' },
    update: {},
    create: {
      nroSerie: 'KAMET-SN-8822',
      alias: 'Zapatos Jane Talla 38',
      modeloId: modZapatoKamet.id,
      estadoId: estadosPorDominio[domEPP.id]['EN_USO'].id,
    }
  });

  // 9. Agrupadores (Conjuntos de Bienes)
  const tipoAgrupPuesto = await prisma.tipoAgrupador.upsert({
    where: { nombre_dominioId: { nombre: 'Puesto de Trabajo', dominioId: domInfo.id } },
    update: {},
    create: {
      nombre: 'Puesto de Trabajo',
      dominioId: domInfo.id,
      asignable: true,
    }
  });

  const agrupadorPuestoJohn = await prisma.agrupador.upsert({
    where: { nombre_tipoAgrupadorId: { nombre: 'Puesto IT - John Doe', tipoAgrupadorId: tipoAgrupPuesto.id } },
    update: {},
    create: {
      nombre: 'Puesto IT - John Doe',
      estado: 'ASIGNADO',
      tipoAgrupadorId: tipoAgrupPuesto.id,
    }
  });

  // Asociar Monitor 1 al puesto de John Doe
  await prisma.articulo.update({
    where: { id: artMonitor1.id },
    data: { agrupadorId: agrupadorPuestoJohn.id }
  });

  // 10. Asignaciones activas
  const existingAsig1 = await prisma.asignacionArticulo.findFirst({
    where: { articuloId: artNotebook1.id }
  });
  if (!existingAsig1) {
    await prisma.asignacionArticulo.create({
      data: {
        articuloId: artNotebook1.id,
        empleadoId: empJohn.id,
        fechaEntrega: new Date('2026-01-15T09:00:00Z'),
        observaciones: 'Asignación directa para trabajo remoto.'
      }
    });
  }

  const existingAsig2 = await prisma.asignacionAgrupador.findFirst({
    where: { agrupadorId: agrupadorPuestoJohn.id }
  });
  if (!existingAsig2) {
    await prisma.asignacionAgrupador.create({
      data: {
        agrupadorId: agrupadorPuestoJohn.id,
        empleadoId: empJohn.id,
        fechaEntrega: new Date('2026-02-10T10:30:00.000Z'),
        observaciones: 'Monitor y periféricos asociados al puesto.'
      }
    });
  }

  const existingAsig3 = await prisma.asignacionArticulo.findFirst({
    where: { articuloId: artZapatosJane.id }
  });
  if (!existingAsig3) {
    await prisma.asignacionArticulo.create({
      data: {
        articuloId: artZapatosJane.id,
        empleadoId: empJane.id,
        fechaEntrega: new Date('2026-03-01T08:00:00Z'),
        observaciones: 'EPP Anual obligatorio.'
      }
    });
  }

  // 11. Historial de asignaciones previas (Devoluciones pasadas)
  const artNotebookVieja = await prisma.articulo.upsert({
    where: { nroSerie: 'DELL-SN-009988' },
    update: {},
    create: {
      nroSerie: 'DELL-SN-009988',
      alias: 'Notebook IT John Vieja',
      modeloId: modLatitude.id,
      estadoId: estadosPorDominio[domInfo.id]['DISPONIBLE'].id,
    }
  });

  const existingAsig4 = await prisma.asignacionArticulo.findFirst({
    where: { articuloId: artNotebookVieja.id }
  });
  if (!existingAsig4) {
    await prisma.asignacionArticulo.create({
      data: {
        articuloId: artNotebookVieja.id,
        empleadoId: empJohn.id,
        fechaEntrega: new Date('2025-01-10T09:00:00Z'),
        fechaDevolucion: new Date('2026-01-15T08:45:00Z'),
        observaciones: 'Devolución de equipo por recambio tecnológico.'
      }
    });
  }

  // 12. Solicitudes y reportes para testing
  const existingSol1 = await prisma.solicitud.findFirst({
    where: { empleadoId: empJohn.id, tipo: 'ROTURA', articuloId: artMonitor1.id }
  });
  if (!existingSol1) {
    await prisma.solicitud.create({
      data: {
        tipo: 'ROTURA',
        estado: 'PENDIENTE',
        empleadoId: empJohn.id,
        dominioId: domInfo.id,
        articuloId: artMonitor1.id,
        motivo: 'El monitor parpadea constantemente y muestra una línea vertical violeta en la pantalla.',
      }
    });
  }

  const existingSol2 = await prisma.solicitud.findFirst({
    where: { empleadoId: empJohn.id, tipo: 'ESCASEZ', categoriaId: catConsumibles.id }
  });
  if (!existingSol2) {
    await prisma.solicitud.create({
      data: {
        tipo: 'ESCASEZ',
        estado: 'PENDIENTE',
        empleadoId: empJohn.id,
        dominioId: domLibreria.id,
        categoriaId: catConsumibles.id,
        cantidad: 3,
        motivo: 'Necesitamos imprimir planos y planillas de stock físico para el conteo anual.',
      }
    });
  }

  const existingSol3 = await prisma.solicitud.findFirst({
    where: { empleadoId: empJane.id, tipo: 'TEMPORAL', categoriaId: catCalzado.id }
  });
  if (!existingSol3) {
    await prisma.solicitud.create({
      data: {
        tipo: 'TEMPORAL',
        estado: 'PENDIENTE',
        empleadoId: empJane.id,
        dominioId: domEPP.id,
        categoriaId: catCalzado.id,
        fechaInicio: new Date('2026-08-10T00:00:00Z'),
        fechaFin: new Date('2026-08-20T00:00:00Z'),
        motivo: 'Visita de auditoría técnica en planta. Requiere botines de acero para el recorrido.',
      }
    });
  }

  const existingSol4 = await prisma.solicitud.findFirst({
    where: { empleadoId: empJane.id, tipo: 'ESCASEZ', categoriaId: catLibreriaGral.id }
  });
  if (!existingSol4) {
    await prisma.solicitud.create({
      data: {
        tipo: 'ESCASEZ',
        estado: 'APROBADA',
        empleadoId: empJane.id,
        dominioId: domLibreria.id,
        categoriaId: catLibreriaGral.id,
        cantidad: 10,
        motivo: 'Lapiceras y carpetas para capacitación de inducción.',
        observacionesAdmin: 'Entregadas carpetas azules de la oficina central.',
        createdAt: new Date('2026-07-25T14:20:00Z'),
        updatedAt: new Date('2026-07-25T16:00:00Z')
      }
    });
  }

  console.log("Demo database seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
