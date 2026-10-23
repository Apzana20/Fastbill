'use client'

import InventoryClient from '@/app/inventory/InventoryClient'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-static'

export default async function InventoryPage() {
  const products = await prisma.product.findMany({
    orderBy: { id: 'asc' },
  })
  // Map to expected shape
  const initialProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    mrp: Number(p.mrp),
    price1: Number(p.price1),
    price2: Number(p.price2),
    price3: Number(p.price3),
    createdAt: p.createdAt,
  }))

  return <InventoryClient initialProducts={initialProducts} />
}

