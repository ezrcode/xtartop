import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { auth } from '@/auth';

// Tipos de archivo permitidos por categoría
const ALLOWED_TYPES: Record<string, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Límites de tamaño por categoría (en bytes)
const SIZE_LIMITS: Record<string, number> = {
    profile: 2 * 1024 * 1024,     // 2MB para fotos de perfil
    logo: 2 * 1024 * 1024,        // 2MB para logos
    attachment: 10 * 1024 * 1024, // 10MB para adjuntos
};

export async function POST(request: NextRequest) {
    try {
        // Verificar autenticación
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const category = formData.get('category') as string || 'attachment';
        const folder = formData.get('folder') as string || 'uploads';

        if (!file) {
            return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
        }

        // Validar tipo de archivo
        const allowedTypes = category === 'profile' || category === 'logo' 
            ? ALLOWED_TYPES.image 
            : ALLOWED_TYPES.all;
        
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ 
                error: `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}` 
            }, { status: 400 });
        }

        // Validar tamaño
        const maxSize = SIZE_LIMITS[category] || SIZE_LIMITS.attachment;
        if (file.size > maxSize) {
            const maxMB = maxSize / (1024 * 1024);
            return NextResponse.json({ 
                error: `El archivo es muy grande. Máximo: ${maxMB}MB` 
            }, { status: 400 });
        }

        // Generar nombre único
        const timestamp = Date.now();
        const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
        const filename = `${folder}/${category}-${timestamp}-${sanitizedName}`;

        // Subir a Vercel Blob
        const blob = await put(filename, file, {
            access: 'public',
            addRandomSuffix: false,
        });

        return NextResponse.json({ 
            url: blob.url,
            filename: file.name,
            size: file.size,
            type: file.type,
        }, { status: 200 });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ 
            error: 'Error al subir archivo' 
        }, { status: 500 });
    }
}

// Endpoint para eliminar archivos
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL no proporcionada' }, { status: 400 });
        }

        // Solo permitir eliminar archivos de nuestro blob storage
        if (!url.includes('vercel-storage.com') && !url.includes('blob.vercel-storage.com')) {
            return NextResponse.json({ error: 'URL no válida' }, { status: 400 });
        }

        await del(url);

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ 
            error: 'Error al eliminar archivo' 
        }, { status: 500 });
    }
}
