import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/auth';

// Tipos de archivo permitidos por categoría
const ALLOWED_TYPES: Record<string, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    quote: ['application/pdf'],
    all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Límites de tamaño por categoría (en bytes)
const SIZE_LIMITS: Record<string, number> = {
    profile: 2 * 1024 * 1024,     // 2MB para fotos de perfil
    logo: 2 * 1024 * 1024,        // 2MB para logos
    quote: 50 * 1024 * 1024,      // 50MB para cotizaciones PDF
    attachment: 10 * 1024 * 1024, // 10MB para adjuntos
};

const getAllowedTypes = (category: string) => {
    if (category === 'profile' || category === 'logo') return ALLOWED_TYPES.image;
    if (category === 'quote') return ALLOWED_TYPES.quote;
    return ALLOWED_TYPES.all;
};

const sanitizePathSegment = (value: string, fallback: string) => {
    const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
    return sanitized || fallback;
};

const parseClientPayload = (clientPayload: string | null) => {
    if (!clientPayload) {
        return { category: 'attachment', folder: 'uploads' };
    }

    try {
        const payload = JSON.parse(clientPayload) as { category?: string; folder?: string };
        return {
            category: payload.category || 'attachment',
            folder: payload.folder || 'uploads',
        };
    } catch {
        return { category: 'attachment', folder: 'uploads' };
    }
};

export async function POST(request: NextRequest) {
    try {
        // Verificar autenticación
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const body = await request.json() as HandleUploadBody;

            const response = await handleUpload({
                request,
                body,
                onBeforeGenerateToken: async (pathname, clientPayload) => {
                    const { category, folder } = parseClientPayload(clientPayload);
                    const safeCategory = sanitizePathSegment(category, 'attachment');
                    const safeFolder = sanitizePathSegment(folder, 'uploads');
                    const expectedPrefix = `${safeFolder}/${safeCategory}-`;

                    if (!pathname.startsWith(expectedPrefix) || pathname.includes('..')) {
                        throw new Error('Ruta de archivo no permitida');
                    }

                    return {
                        allowedContentTypes: getAllowedTypes(safeCategory),
                        maximumSizeInBytes: SIZE_LIMITS[safeCategory] || SIZE_LIMITS.attachment,
                        addRandomSuffix: false,
                        tokenPayload: JSON.stringify({ category: safeCategory, folder: safeFolder }),
                    };
                },
            });

            return NextResponse.json(response);
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const category = formData.get('category') as string || 'attachment';
        const folder = formData.get('folder') as string || 'uploads';

        if (!file) {
            return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
        }

        // Validar tipo de archivo
        const allowedTypes = getAllowedTypes(category);
        
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
        const filename = `${folder}/${category}-${timestamp}-${sanitizedName}.${extension}`;

        // Convertir File a ArrayBuffer para Vercel Blob
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Subir a Vercel Blob
        const blob = await put(filename, buffer, {
            access: 'public',
            addRandomSuffix: false,
            contentType: file.type,
        });

        return NextResponse.json({ 
            url: blob.url,
            filename: file.name,
            size: file.size,
            type: file.type,
        }, { status: 200 });

    } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json({ 
            error: `Error al subir archivo: ${errorMessage}` 
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
