import { PrismaClient, CompanyOrigin, CompanyStatus, CompanyType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Función para parsear fecha en formato DD/MM/YYYY
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-indexed
  let year = parseInt(parts[2], 10);
  
  // Corrección de años con errores obvios
  if (year > 2030) {
    // Años futuros probablemente son errores de tipeo
    console.warn(`  ⚠️  Año ${year} parece incorrecto, ajustando...`);
    if (year === 2044) year = 2024;
    else if (year === 2055) year = 2025;
    else if (year === 2002 && month === 3 && day === 21) year = 2022; // Caso específico RESIDENZA
    else year = 2024; // Default a 2024 si no sabemos
  }
  
  return new Date(year, month, day);
}

// Función para parsear CSV
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const records: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const record: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() || '';
    });
    
    records.push(record);
  }
  
  return records;
}

// Mapeo de origin
function mapOrigin(origin: string): CompanyOrigin | null {
  const mapping: Record<string, CompanyOrigin> = {
    'PROSPECCION_MANUAL': 'PROSPECCION_MANUAL',
    'REFERIDO_CLIENTE': 'REFERIDO_CLIENTE',
    'REFERIDO_ALIADO': 'REFERIDO_ALIADO',
    'INBOUND_MARKETING': 'INBOUND_MARKETING',
    'OUTBOUND_MARKETING': 'OUTBOUND_MARKETING',
    'EVENTO_PRESENCIAL': 'EVENTO_PRESENCIAL',
  };
  return mapping[origin] || null;
}

// Mapeo de status (old → new status + type)
function mapStatusAndType(status: string): { status: CompanyStatus; type: CompanyType } {
  const mapping: Record<string, { status: CompanyStatus; type: CompanyType }> = {
    'PROSPECTO': { status: 'ACTIVO', type: 'PROSPECTO' },
    'POTENCIAL': { status: 'ACTIVO', type: 'POTENCIAL' },
    'CLIENTE': { status: 'ACTIVO', type: 'CLIENTE_SUSCRIPTOR' },
    'PROVEEDOR': { status: 'ACTIVO', type: 'PROVEEDOR' },
    'DESCARTADA': { status: 'INACTIVO', type: 'NO_CALIFICA' },
    'INACTIVA': { status: 'INACTIVO', type: 'SIN_MOTIVO' },
  };
  return mapping[status] || { status: 'ACTIVO', type: 'PROSPECTO' };
}

async function main() {
  console.log('🚀 Iniciando importación de empresas...\n');
  
  // Leer CSV
  const csvPath = path.join(__dirname, '../public/NBY Sales History - Empresas.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvContent);
  
  console.log(`📄 ${records.length} empresas encontradas en el CSV\n`);
  
  // Obtener el workspace y usuario por defecto
  const workspace = await prisma.workspace.findFirst({
    include: { owner: true }
  });
  
  if (!workspace) {
    console.error('❌ No se encontró ningún workspace. Crea uno primero.');
    process.exit(1);
  }
  
  console.log(`📁 Usando workspace: ${workspace.name} (Owner: ${workspace.owner.email})\n`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of records) {
    try {
      // Verificar si ya existe
      const existing = await prisma.company.findFirst({
        where: {
          workspaceId: workspace.id,
          OR: [
            { name: record.name },
            { taxId: record.taxId || undefined }
          ]
        }
      });
      
      if (existing) {
        console.log(`⏭️  ${record.name} ya existe, saltando...`);
        skipped++;
        continue;
      }
      
      // Parsear fechas
      const createdAt = parseDate(record.createdAt) || new Date();
      const termsAcceptedAt = parseDate(record.termsAcceptedAt);
      
      // Limpiar RNC (quitar guiones)
      const taxId = record.taxId ? record.taxId.replace(/-/g, '') : null;
      
      // Crear empresa
      const company = await prisma.company.create({
        data: {
          name: record.name,
          taxId: taxId,
          legalName: record.legalName || null,
          initialProjects: record.initialProjects ? parseInt(record.initialProjects, 10) : 0,
          initialUsers: record.initialUsers ? parseInt(record.initialUsers, 10) : 0,
          country: record.country || null,
          city: record.city || null,
          phone: record.phone || null,
          website: record.website || null,
          instagramUrl: record.instagramUrl || null,
          linkedinUrl: record.linkedinUrl || null,
          origin: mapOrigin(record.origin),
          ...mapStatusAndType(record.status),
          termsAccepted: record.termsAccepted?.toUpperCase() === 'TRUE',
          termsAcceptedAt: termsAcceptedAt,
          termsAcceptedByName: record.termsAcceptedByName || null,
          termsVersion: record.termsVersion || null,
          workspaceId: workspace.id,
          createdById: workspace.ownerId,
          createdAt: createdAt,
        }
      });
      
      console.log(`✅ ${company.name} importado (createdAt: ${createdAt.toLocaleDateString('es-ES')})`);
      imported++;
      
    } catch (error) {
      console.error(`❌ Error importando ${record.name}:`, error);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Resumen:`);
  console.log(`   ✅ Importados: ${imported}`);
  console.log(`   ⏭️  Saltados (ya existían): ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
