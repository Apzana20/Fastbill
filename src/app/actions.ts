'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function getNextNumericProductId(): Promise<string> {
  const products = await prisma.product.findMany({ select: { id: true } })
  const numericIds = products
    .map((p) => parseInt(p.id, 10))
    .filter((n) => !isNaN(n))
  const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1001
  return String(nextId)
}

export async function createProduct(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const quantity = parseInt(formData.get('quantity') as string) || 0
  const mrp = parseFloat(formData.get('mrp') as string) || 0
  const price1 = parseFloat(formData.get('price1') as string) || 0
  const price2 = parseFloat(formData.get('price2') as string) || 0
  const price3 = parseFloat(formData.get('price3') as string) || 0

  if (!name) return

  const id = await getNextNumericProductId()
  await prisma.product.create({
    data: {
      id,
      name,
      quantity,
      mrp,
      price1,
      price2,
      price3,
    },
  })

  revalidatePath('/purchase')
  revalidatePath('/inventory')
  revalidatePath('/')
}

// Delete a product by its numeric ID with transaction handling for related records
export async function deleteProduct(productId: string) {
  try {
    await prisma.$transaction([
      // Delete related purchase logs
      prisma.purchase.deleteMany({ where: { productId } }),
      // Delete related sales items (including cascade from sales returns)
      prisma.saleItem.deleteMany({ where: { productId } }),
      // Delete related sales returns
      prisma.salesReturn.deleteMany({ where: { productId } }),
      // Finally delete the product itself
      prisma.product.delete({ where: { id: productId } }),
    ])
    // Revalidate affected pages
    revalidatePath('/inventory')
    revalidatePath('/purchase')
    revalidatePath('/')
  } catch (error) {
    console.error('Failed to delete product', productId, error)
    throw error
  }
}


export async function recordPurchase(formData: FormData) {
  const productId = formData.get('productId') as string
  const quantityAdded = parseInt(formData.get('quantityAdded') as string) || 0
  const purchasePrice = parseFloat(formData.get('purchasePrice') as string) || 0

  if (!productId || quantityAdded <= 0) return

  await prisma.$transaction([
    prisma.purchase.create({
      data: {
        productId,
        quantityAdded,
        purchasePrice,
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: {
        quantity: {
          increment: quantityAdded,
        },
      },
    }),
  ])

  revalidatePath('/')
}

export async function createSale(formData: FormData) {
  const productId = formData.get('productId') as string
  const priceTier = (formData.get('priceTier') as string) || 'price1'
  const quantity = parseInt(formData.get('quantity') as string) || 1

  const product = await prisma.product.findUnique({
    where: { id: productId },
  })

  if (!product || product.quantity < quantity) {
    throw new Error('Product not found or insufficient stock.')
  }

  let selectedPrice = product.price1
  if (priceTier === 'price2') selectedPrice = product.price2
  if (priceTier === 'price3') selectedPrice = product.price3

  const subtotal = selectedPrice * quantity
  const saleCount = await prisma.sale.count()
  const saleNumber = `SALE-${String(saleCount + 1001).padStart(4, '0')}`

  await prisma.$transaction([
    prisma.sale.create({
      data: {
        saleNumber,
        totalAmount: subtotal,
        items: {
          create: [
            {
              productId,
              quantity,
              selectedPrice,
              subtotal,
            },
          ],
        },
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    }),
  ])

  revalidatePath('/')
}

export async function recordSalesReturn(formData: FormData) {
  const saleId = formData.get('saleId') as string
  const productId = formData.get('productId') as string
  const quantityReturned = parseInt(formData.get('quantityReturned') as string) || 1

  if (!saleId || !productId || quantityReturned <= 0) return

  await prisma.$transaction([
    prisma.salesReturn.create({
      data: {
        saleId,
        productId,
        quantityReturned,
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: {
        quantity: {
          increment: quantityReturned,
        },
      },
    }),
  ])

  revalidatePath('/')
}

export async function addOrUpdateProductStock(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const quantity = parseInt(formData.get('quantity') as string) || 0
  const mrp = parseFloat(formData.get('mrp') as string) || 0
  const price1 = parseFloat(formData.get('price1') as string) || 0
  const price2 = parseFloat(formData.get('price2') as string) || 0
  const price3 = parseFloat(formData.get('price3') as string) || 0

  if (!name) return

  const allProducts = await prisma.product.findMany()
  const existingProduct = allProducts.find(
    (p) => p.name.trim().toLowerCase() === name.toLowerCase()
  )

  if (existingProduct) {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          quantity: {
            increment: quantity,
          },
          mrp: mrp > 0 ? mrp : existingProduct.mrp,
          price1: price1 > 0 ? price1 : existingProduct.price1,
          price2: price2 > 0 ? price2 : existingProduct.price2,
          price3: price3 > 0 ? price3 : existingProduct.price3,
        },
      }),
      prisma.purchase.create({
        data: {
          productId: existingProduct.id,
          quantityAdded: quantity,
          purchasePrice: price1 > 0 ? price1 : existingProduct.price1,
        },
      }),
    ])
  } else {
    const id = await getNextNumericProductId()
    const created = await prisma.product.create({
      data: {
        id,
        name,
        quantity,
        mrp,
        price1,
        price2,
        price3,
      },
    })

    if (quantity > 0) {
      await prisma.purchase.create({
        data: {
          productId: created.id,
          quantityAdded: quantity,
          purchasePrice: price1,
        },
      })
    }
  }

  revalidatePath('/purchase')
  revalidatePath('/inventory')
  revalidatePath('/')
}

export interface SaleBillItemInput {
  productId: string
  quantity: number
  selectedPrice: number
  subtotal: number
}

export interface CustomerDetailsInput {
  customerName?: string
  customerPhone?: string
}

export async function generateSaleBill(
  items: SaleBillItemInput[],
  customerDetails?: CustomerDetailsInput
) {
  if (!items || items.length === 0) {
    throw new Error('Please add at least one item to generate a bill.')
  }

  for (const item of items) {
    if (!item.quantity || item.quantity <= 0) {
      throw new Error('Invalid quantity for one or more items.')
    }
    if (typeof item.selectedPrice !== 'number' || isNaN(item.selectedPrice) || item.selectedPrice < 0) {
      throw new Error('Invalid selling price for one or more items.')
    }
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    })
    if (!product) {
      throw new Error('Product not found.')
    }
    if (product.quantity < item.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.quantity}, requested: ${item.quantity}`
      )
    }
  }

  const grandTotal = items.reduce(
    (acc, it) => acc + Number((it.selectedPrice * it.quantity).toFixed(2)),
    0
  )
  const count = await prisma.sale.count()
  const saleNumber = `SALE-${String(count + 1001).padStart(5, '0')}`

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        saleNumber,
        customerName: customerDetails?.customerName?.trim() || null,
        customerPhone: customerDetails?.customerPhone?.trim() || null,
        totalAmount: grandTotal,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: itemQuantity(it.quantity),
            selectedPrice: it.selectedPrice,
            subtotal: Number((it.selectedPrice * it.quantity).toFixed(2)),
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      })
    }

    return createdSale
  })

  revalidatePath('/sales')
  revalidatePath('/sales/history')
  revalidatePath('/purchase')
  revalidatePath('/inventory')
  revalidatePath('/')

  return { success: true, sale }
}

function itemQuantity(qty: number): number {
  return Number.isInteger(qty) ? qty : Math.round(qty)
}

export interface SalesReturnItemInput {
  saleId: string
  productId: string
  quantityReturned: number
}

export async function processSalesReturn(returns: SalesReturnItemInput[]) {
  if (!returns || returns.length === 0) {
    throw new Error('Please select at least one item to return.')
  }

  for (const item of returns) {
    if (!item.quantityReturned || item.quantityReturned <= 0) {
      throw new Error('Quantity returned must be greater than zero.')
    }

    const sale = await prisma.sale.findUnique({
      where: { id: item.saleId },
      include: {
        items: true,
        salesReturns: true,
      },
    })

    if (!sale) {
      throw new Error('Sale record not found.')
    }

    const saleItem = sale.items.find((si) => si.productId === item.productId)
    if (!saleItem) {
      throw new Error('Product not found in this bill.')
    }

    const alreadyReturned = sale.salesReturns
      .filter((sr) => sr.productId === item.productId)
      .reduce((sum, sr) => sum + sr.quantityReturned, 0)

    const returnable = saleItem.quantity - alreadyReturned
    if (item.quantityReturned > returnable) {
      throw new Error(
        `Cannot return ${item.quantityReturned} units. Only ${returnable} units remain eligible for return.`
      )
    }
  }

  const results = await prisma.$transaction(async (tx) => {
    const createdReturns = []
    const updatedProducts: Array<{ id: string; name: string; quantity: number }> = []

    for (const item of returns) {
      const updatedProduct = await tx.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            increment: item.quantityReturned,
          },
        },
      })

      const created = await tx.salesReturn.create({
        data: {
          saleId: item.saleId,
          productId: item.productId,
          quantityReturned: item.quantityReturned,
        },
        include: {
          product: true,
          sale: true,
        },
      })

      createdReturns.push(created)
      updatedProducts.push({
        id: updatedProduct.id,
        name: updatedProduct.name,
        quantity: updatedProduct.quantity,
      })
    }
    return { createdReturns, updatedProducts }
  })

  revalidatePath('/sales-return')
  revalidatePath('/sales')
  revalidatePath('/purchase')
  revalidatePath('/')

  return {
    success: true,
    returns: results.createdReturns,
    updatedProducts: results.updatedProducts,
  }
}

export async function getSaleForReturn(searchQuery: string) {
  const query = searchQuery.trim()
  if (!query) return null

  return prisma.sale.findFirst({
    where: {
      OR: [
        { id: query },
        { saleNumber: { equals: query } },
        { saleNumber: { contains: query } },
        { customerName: { contains: query } },
        { customerPhone: { contains: query } },
      ],
    },
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
  })
}

export async function getAllSales() {
  return prisma.sale.findMany({
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
  })
}