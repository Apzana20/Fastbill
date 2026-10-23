import prisma from '@/lib/prisma'
import SalesHistoryClient, { SaleRecord } from './SalesHistoryClient'

export const dynamic = 'force-dynamic'

export default async function SalesHistoryPage() {
  const sales = await prisma.sale.findMany({
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              mrp: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return <SalesHistoryClient initialSales={sales as unknown as SaleRecord[]} />
}

