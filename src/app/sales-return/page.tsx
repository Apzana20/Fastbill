import prisma from '@/lib/prisma'
import SalesReturnClient from './SalesReturnClient'

export const dynamic = 'force-dynamic'

export default async function SalesReturnPage() {
  const [sales, recentReturns, allProducts] = await Promise.all([
    prisma.sale.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
        salesReturns: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.salesReturn.findMany({
      include: {
        product: true,
        sale: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        quantity: true,
      },
    }),
  ])

  return (
    <SalesReturnClient
      initialSales={sales}
      initialReturns={recentReturns}
      initialProducts={allProducts}
    />
  )
}
