# NEARBY CRM

**Sistema de Gestión de Relaciones con Clientes**

NEARBY CRM es el sistema interno de gestión de clientes de NEARBY. Permite administrar empresas, contactos, oportunidades de negocio y cotizaciones.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Auth.js (NextAuth)

## Características

- **Empresas**: Gestión de empresas y clientes
- **Contactos**: Administración de contactos asociados a empresas
- **Negocios**: Pipeline de ventas con vista Kanban y tabla
- **Cotizaciones**: Generación de cotizaciones con PDF
- **Email**: Envío de emails desde la plataforma
- **Workspaces**: Colaboración en equipo con roles

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (o usar Docker)

### Con Docker

```bash
docker-compose up -d
```

### Instalación Manual

1.  Clonar el repositorio:
    ```bash
    git clone <repository-url>
    cd nearby-crm
    ```

2.  Instalar dependencias:
    ```bash
    npm install
    ```

3.  Configurar variables de entorno:
    ```bash
    cp .env.example .env
    ```

4.  Ejecutar migraciones:
    ```bash
    npx prisma migrate dev
    ```

5.  Iniciar servidor de desarrollo:
    ```bash
    npm run dev
    ```

    Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## License

Propiedad de NEARBY

