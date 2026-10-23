const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.product.count()
  if (count > 0) {
    console.log('Database already has products. Skipping seed.')
    return
  }

  // 1. Create sample products
  const productA = await prisma.product.create({
    data: {
      name: 'Wireless Barcode Scanner',
      quantity: 25,
      mrp: 3500.0,
      price1: 3200.0, // Price tier 1 (Retail)
      price2: 2900.0, // Price tier 2 (Wholesale)
      price3: 2700.0, // Price tier 3 (Special)
    },
  })

  const productB = await prisma.product.create({
    data: {
      name: 'Thermal Receipt Printer 80mm',
      quantity: 15,
      mrp: 6000.0,
      price1: 5500.0,
      price2: 5100.0,
      price3: 4800.0,
    },
  })

  const productC = await prisma.product.create({
    data: {
      name: 'Cash Drawer Heavy Duty',
      quantity: 10,
      mrp: 4500.0,
      price1: 4200.0,
      price2: 3900.0,
      price3: 3600.0,
    },
  })

  // 2. Record initial purchases
  await prisma.purchase.createMany({
    data: [
      {
        productId: productA.id,
        quantityAdded: 30,
        purchasePrice: 2200.0,
      },
      {
        productId: productB.id,
        quantityAdded: 20,
        purchasePrice: 4000.0,
      },
      {
        productId: productC.id,
        quantityAdded: 10,
        purchasePrice: 3000.0,
      },
    ],
  })

  // 3. Create a sample Sale with SaleItems
  const sale1 = await prisma.sale.create({
    data: {
      saleNumber: 'SALE-1001',
      totalAmount: 3200.0 * 2 + 5100.0 * 1, // 11500.00
      items: {
        create: [
          {
            productId: productA.id,
            quantity: 2,
            selectedPrice: productA.price1,
            subtotal: 3200.0 * 2,
          },
          {
            productId: productB.id,
            quantity: 1,
            selectedPrice: productB.price2,
            subtotal: 5100.0 * 1,
          },
        ],
      },
    },
  })

  // 4. Create a sample Sales Return
  await prisma.salesReturn.create({
    data: {
      saleId: sale1.id,
      productId: productA.id,
      quantityReturned: 1,
    },
  })

  console.log('Billing & Inventory seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
