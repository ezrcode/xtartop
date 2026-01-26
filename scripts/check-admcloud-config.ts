/**
 * Script para verificar la configuración de AdmCloud en la BD
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConfig() {
    console.log('Checking AdmCloud configuration in database...\n');
    
    const workspaces = await prisma.workspace.findMany({
        select: {
            id: true,
            name: true,
            admCloudEnabled: true,
            admCloudAppId: true,
            admCloudUsername: true,
            admCloudPassword: true,
            admCloudCompany: true,
            admCloudRole: true,
        }
    });
    
    for (const ws of workspaces) {
        console.log('Workspace:', ws.name);
        console.log('  ID:', ws.id);
        console.log('  admCloudEnabled:', ws.admCloudEnabled);
        console.log('  admCloudAppId:', ws.admCloudAppId ? ws.admCloudAppId.substring(0, 8) + '...' : null);
        console.log('  admCloudUsername:', ws.admCloudUsername);
        console.log('  admCloudPassword:', ws.admCloudPassword ? '***SET***' : null);
        console.log('  admCloudCompany:', ws.admCloudCompany ? ws.admCloudCompany.substring(0, 8) + '...' : null);
        console.log('  admCloudRole:', ws.admCloudRole);
        console.log('');
    }
    
    await prisma.$disconnect();
}

checkConfig().catch(console.error);
