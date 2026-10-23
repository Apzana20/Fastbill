# Billing Software

A modern billing software starter built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **SQLite** using **Prisma ORM**.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components & Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [SQLite](https://www.sqlite.org/) (Local file at `prisma/dev.db`)
- **ORM**: [Prisma](https://www.prisma.io/)

---

## 🚀 Getting Started

### 1. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the Billing Dashboard.

### 2. Database Management with Prisma

- **Open Prisma Studio** (Visual Web UI to explore and edit SQLite records):
  ```bash
  npx prisma studio
  ```
- **Sync Database Schema** (apply schema changes):
  ```bash
  npx prisma db push
  ```
- **Seed Database** (populate sample customers and invoices):
  ```bash
  npx prisma db seed
  ```
- **Generate Prisma Client**:
  ```bash
  npx prisma generate
  ```

---

## 📁 Project Structure

```text
├── prisma/
│   ├── dev.db             # Local SQLite database file
│   ├── schema.prisma      # Prisma database models (Customer, Invoice, InvoiceItem)
│   └── seed.js            # Database seeding script
├── src/
│   ├── app/
│   │   ├── actions.ts     # Next.js Server Actions for billing operations
│   │   ├── layout.tsx     # Root App Router layout
│   │   ├── page.tsx       # Billing dashboard & invoice generator UI
│   │   └── globals.css    # Tailwind CSS styling
│   └── lib/
│       └── prisma.ts      # Global PrismaClient singleton
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```
