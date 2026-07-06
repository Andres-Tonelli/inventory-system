const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const csvDir = 'C:\\Users\\TAG-142\\Downloads\\inventario';

function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = [];
    let inQuotes = false;
    let currentField = '';
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    row.push(currentField.trim());
    result.push(row);
  }
  
  const headers = result[0];
  const data = [];
  for (let i = 1; i < result.length; i++) {
    const row = result[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] || '';
    }
    data.push(obj);
  }
  return data;
}

async function main() {
  console.log("=== STARTING CSV SEEDING ===");
  
  // 1. Get or create Domain "Informática"
  let dominio = await prisma.dominioInventario.findFirst({
    where: { nombre: { equals: 'Informática', mode: 'insensitive' } }
  });
  if (!dominio) {
    dominio = await prisma.dominioInventario.create({
      data: { nombre: 'Informática' }
    });
  }
  const dominioId = dominio.id;
  console.log(`Using Domain "Informática" with ID: ${dominioId}`);

  // 2. Load Areas
  const areasData = parseCSV(fs.readFileSync(path.join(csvDir, 'Area.csv'), 'utf8'));
  const areaMap = new Map(); // name -> id
  for (const row of areasData) {
    const name = row['Título'];
    if (!name) continue;
    let areaObj = await prisma.area.findUnique({ where: { nombre: name } });
    if (!areaObj) {
      areaObj = await prisma.area.create({ data: { nombre: name } });
    }
    areaMap.set(name.toLowerCase(), areaObj.id);
  }
  console.log(`Loaded ${areaMap.size} areas`);

  // 3. Load Personas (Empleados)
  const personasData = parseCSV(fs.readFileSync(path.join(csvDir, 'Persona.csv'), 'utf8'));
  let empCount = 0;
  for (const row of personasData) {
    const id = row['ID'];
    const nombre = row['Título'];
    const areaName = row['Area'];
    if (!id || !nombre) continue;
    const legajo = `LEG-${id}`;
    const areaId = areaMap.get(areaName.toLowerCase()) || areaMap.values().next().value; // Fallback to first area if not found
    
    await prisma.empleado.upsert({
      where: { legajo },
      update: { nombre, areaId },
      create: { legajo, nombre, areaId }
    });
    empCount++;
  }
  console.log(`Upserted ${empCount} personas (empleados)`);

  // 4. Load Categorias
  const categoriasData = parseCSV(fs.readFileSync(path.join(csvDir, 'Categoria.csv'), 'utf8'));
  const catMap = new Map(); // name -> id
  for (const row of categoriasData) {
    const name = row['Título'];
    if (!name) continue;
    let catObj = await prisma.categoria.findFirst({
      where: { nombre: name, dominioId }
    });
    if (!catObj) {
      catObj = await prisma.categoria.create({
        data: { nombre: name, dominioId, tipoSeguimiento: 'UNITARIO' }
      });
    }
    catMap.set(name.toLowerCase(), catObj.id);
  }
  console.log(`Loaded ${catMap.size} categorias`);

  // 5. Load Marcas
  const marcasData = parseCSV(fs.readFileSync(path.join(csvDir, 'Marca.csv'), 'utf8'));
  const marcaMap = new Map(); // name -> id
  for (const row of marcasData) {
    const name = row['Título'];
    if (!name) continue;
    let marcaObj = await prisma.marca.findFirst({
      where: { nombre: name, dominioId }
    });
    if (!marcaObj) {
      marcaObj = await prisma.marca.create({
        data: { nombre: name, dominioId }
      });
    }
    marcaMap.set(name.toLowerCase(), marcaObj.id);
  }
  console.log(`Loaded ${marcaMap.size} marcas`);

  // 6. Load Modelos
  const modelosData = parseCSV(fs.readFileSync(path.join(csvDir, 'Modelo.csv'), 'utf8'));
  const modeloMap = new Map(); // name -> id
  for (const row of modelosData) {
    const id = row['ID'];
    const name = row['Título'];
    const brandName = row['Marca'];
    const catName = row['Categoria'];
    if (!name) continue;
    
    const marcaId = marcaMap.get(brandName.toLowerCase());
    const categoriaId = catMap.get(catName.toLowerCase());
    if (!marcaId || !categoriaId) {
      console.warn(`Skipping model ${name}: brand or category not found`);
      continue;
    }
    
    let modelObj = await prisma.modelo.findFirst({
      where: { nombre: name, marcaId, categoriaId }
    });
    if (!modelObj) {
      modelObj = await prisma.modelo.create({
        data: { nombre: name, marcaId, categoriaId }
      });
    }
    modeloMap.set(name.toLowerCase(), modelObj.id);
  }
  console.log(`Loaded ${modeloMap.size} modelos`);

  // 7. Load Estados de Artículos
  const estadosData = parseCSV(fs.readFileSync(path.join(csvDir, 'Estado.csv'), 'utf8'));
  const estadoMap = new Map(); // name -> id
  for (const row of estadosData) {
    const name = row['Título'];
    if (!name) continue;
    let estObj = await prisma.estadoArticulo.findUnique({
      where: { nombre: name }
    });
    if (!estObj) {
      const codigo = name.trim().toUpperCase()
        .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U').replace(/Ñ/g, 'N')
        .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      estObj = await prisma.estadoArticulo.create({
        data: { nombre: name, codigo }
      });
    }
    estadoMap.set(name.toLowerCase(), estObj.id);
  }
  console.log(`Loaded ${estadoMap.size} estados`);

  // 8. Get or create TipoAgrupador "PC"
  let tipoAgrupadorPC = await prisma.tipoAgrupador.findFirst({
    where: { nombre: 'PC', dominioId }
  });
  if (!tipoAgrupadorPC) {
    tipoAgrupadorPC = await prisma.tipoAgrupador.create({
      data: { nombre: 'PC', dominioId }
    });
  }
  console.log(`Using TipoAgrupador "PC" with ID: ${tipoAgrupadorPC.id}`);

  // 9. Load PCs (Agrupadores)
  const pcData = parseCSV(fs.readFileSync(path.join(csvDir, 'PC.csv'), 'utf8'));
  const pcMap = new Map(); // name -> id
  for (const row of pcData) {
    const name = row['Título'];
    if (!name) continue;
    
    let pcObj = await prisma.agrupador.findFirst({
      where: { nombre: name, tipoAgrupadorId: tipoAgrupadorPC.id }
    });
    if (!pcObj) {
      pcObj = await prisma.agrupador.create({
        data: {
          nombre: name,
          tipoAgrupadorId: tipoAgrupadorPC.id,
          estado: 'DISPONIBLE'
        }
      });
    }
    pcMap.set(name.toLowerCase(), pcObj.id);
  }
  console.log(`Loaded ${pcMap.size} PCs (agrupadores)`);

  // 10. Load EquipoInformatico (Articulos)
  const equipoData = parseCSV(fs.readFileSync(path.join(csvDir, 'EquipoInformatico.csv'), 'utf8'));
  const articleMap = new Map(); // alias -> id
  const processedSeries = new Set();
  let articleCount = 0;
  for (const row of equipoData) {
    const alias = row['Título'];
    const modelName = row['Modelo'];
    let nroSerie = row['N/Serie'];
    const estadoName = row['Estado'];
    if (!alias || !modelName) continue;

    // Clean up nroSerie
    if (!nroSerie || nroSerie === 'S/N' || nroSerie.trim() === '') {
      nroSerie = null;
    } else {
      nroSerie = nroSerie.trim();
    }

    if (nroSerie) {
      if (processedSeries.has(nroSerie)) {
        console.warn(`Duplicate serial number found in CSV: ${nroSerie} for alias ${alias}. Appending suffix.`);
        nroSerie = `${nroSerie}_${alias}`;
      } else {
        const otherArt = await prisma.articulo.findFirst({
          where: {
            nroSerie: nroSerie,
            alias: { not: alias }
          }
        });
        if (otherArt) {
          console.warn(`Serial number ${nroSerie} already exists in DB for alias ${otherArt.alias}. Appending suffix for ${alias}.`);
          nroSerie = `${nroSerie}_${alias}`;
        }
      }
      processedSeries.add(nroSerie);
    }

    const modeloId = modeloMap.get(modelName.toLowerCase());
    const estadoId = estadoMap.get(estadoName.toLowerCase());
    if (!modeloId || !estadoId) {
      console.warn(`Skipping article ${alias}: model (${modelName}) or state (${estadoName}) not found`);
      continue;
    }

    let artObj = await prisma.articulo.findFirst({
      where: { alias: alias }
    });

    if (artObj) {
      artObj = await prisma.articulo.update({
        where: { id: artObj.id },
        data: { nroSerie, estadoId, modeloId }
      });
    } else {
      artObj = await prisma.articulo.create({
        data: { alias, nroSerie, estadoId, modeloId }
      });
    }
    articleMap.set(alias.toLowerCase(), artObj.id);
    articleCount++;
  }
  console.log(`Upserted ${articleCount} equipos informáticos (artículos)`);

  // 11. Link PCEquipoInformatico (Articles to PC Agrupador)
  const linksData = parseCSV(fs.readFileSync(path.join(csvDir, 'PCEquipoInformatico.csv'), 'utf8'));
  let linkCount = 0;
  for (const row of linksData) {
    const pcName = row['PC'];
    const artName = row['EInformatico'];
    if (!pcName || !artName) continue;

    const pcId = pcMap.get(pcName.toLowerCase());
    const artId = articleMap.get(artName.toLowerCase());
    if (!pcId || !artId) {
      continue;
    }

    await prisma.articulo.update({
      where: { id: artId },
      data: { agrupadorId: pcId }
    });
    linkCount++;
  }
  console.log(`Linked ${linkCount} artículos to their PC agrupadores`);

  // 12. Load Puestos (Asignaciones of PC Agrupadores to Employees)
  const puestosData = parseCSV(fs.readFileSync(path.join(csvDir, 'Puesto.csv'), 'utf8'));
  let asignCount = 0;
  for (const row of puestosData) {
    const userName = row['Usuario'];
    const pcName = row['PC'];
    if (!userName || !pcName) continue;

    const pcId = pcMap.get(pcName.toLowerCase());
    const employee = await prisma.empleado.findFirst({
      where: { nombre: { equals: userName, mode: 'insensitive' } }
    });

    if (!pcId || !employee) {
      continue;
    }

    // Check if assignment already exists
    let assignment = await prisma.asignacionAgrupador.findFirst({
      where: { agrupadorId: pcId, empleadoId: employee.id }
    });
    if (!assignment) {
      assignment = await prisma.asignacionAgrupador.create({
        data: {
          agrupadorId: pcId,
          empleadoId: employee.id,
          fechaEntrega: new Date(),
          observaciones: 'Carga inicial desde seed CSV'
        }
      });
    }

    // Update PC status to ASIGNADO
    await prisma.agrupador.update({
      where: { id: pcId },
      data: { estado: 'ASIGNADO' }
    });
    
    asignCount++;
  }
  console.log(`Created ${asignCount} puesto assignments (AsignacionAgrupador)`);

  console.log("=== CSV SEEDING COMPLETED SUCCESSFULLY ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
