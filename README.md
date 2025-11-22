# xtartop

**The OS for Early Founders**

xtartop is a SaaS platform designed to help early-stage founders manage their startups. This repository contains the MVP version focusing on authentication, workspace management, and subscription foundations.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Auth.js (NextAuth)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd xtartop
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    Copy `.env.example` to `.env` and fill in your values.
    ```bash
    cp .env.example .env
    ```

4.  Run database migrations:
    ```bash
    npx prisma migrate dev
    ```

5.  Start the development server:
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser.

## Future Modules

- **CRM**: Manage clients, deals, and pipelines.
- **Invoicing**: Create and send invoices.
- **Proposals**: Generate and track proposals.

## License

MIT
