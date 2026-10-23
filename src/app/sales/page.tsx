import prisma from '@/lib/prisma'
import SalesBillingClient from './SalesBillingClient'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  })

  return <SalesBillingClient initialProducts={products} />
}

