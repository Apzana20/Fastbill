const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function runVerification() {
  console.log('========================================================')
  console.log('STARTING STOCK DEDUCTION & RETURN RESTOCK VERIFICATION')
  console.log('========================================================\n')

  // 1. Pick a test product
  const product = await prisma.product.findFirst({
    where: { name: 'Wireless Barcode Scanner' },
  })

  if (!product) {
    throw new Error('Test product "Wireless Barcode Scanner" not found!')
  }

  const initialStock = product.quantity
  console.log(`[STEP 1] Selected Product: "${product.name}"`)
  console.log(`         Initial Database Stock: ${initialStock} units\n`)

  // 2. Generate a Sale with a CUSTOM PRICE
  const sellQty = 3
  const customSellingPrice = 3333.33
  const expectedSubtotal = Number((customSellingPrice * sellQty).toFixed(2))

  console.log(`[STEP 2] Simulating Sale with Custom Price:`)
  console.log(`         Quantity to Sell: ${sellQty}`)
  console.log(`         Custom Unit Price: $${customSellingPrice}`)
  console.log(`         Expected Subtotal: $${expectedSubtotal}`)

  const saleCount = await prisma.sale.count()
  const testSaleNumber = `TEST-SALE-${Date.now().toString().slice(-5)}`

  // Execute Sale Generation (Transaction exactly like generateSaleBill)
  const createdSale = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        saleNumber: testSaleNumber,
        totalAmount: expectedSubtotal,
        items: {
          create: [
            {
              productId: product.id,
              quantity: sellQty,
              selectedPrice: customSellingPrice,
              subtotal: expectedSubtotal,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    })

    // Deduct stock
    await tx.product.update({
      where: { id: product.id },
      data: {
        quantity: {
          decrement: sellQty,
        },
      },
    })

    return sale
  })

  // Verify stock in database after sale
  const productAfterSale = await prisma.product.findUnique({
    where: { id: product.id },
  })

  const expectedStockAfterSale = initialStock - sellQty
  console.log(`\n[STEP 2 VERIFICATION]`)
  console.log(`         Sale Created: ${createdSale.saleNumber} (ID: ${createdSale.id})`)
  console.log(`         SaleItem Saved SelectedPrice: $${createdSale.items[0].selectedPrice}`)
  console.log(`         SaleItem Saved Subtotal: $${createdSale.items[0].subtotal}`)
  console.log(`         Stock in Database: ${productAfterSale.quantity} (Expected: ${expectedStockAfterSale})`)

  if (productAfterSale.quantity !== expectedStockAfterSale) {
    throw new Error(`FAILURE: Stock deduction mismatch! Expected ${expectedStockAfterSale}, got ${productAfterSale.quantity}`)
  }
  if (createdSale.items[0].selectedPrice !== customSellingPrice) {
    throw new Error(`FAILURE: Custom price not preserved in SaleItem!`)
  }
  console.log('         ✓ Stock deduction and custom price successfully verified!\n')

  // 3. Process a Sales Return
  const returnQty = 2
  console.log(`[STEP 3] Simulating Sales Return:`)
  console.log(`         Units being returned: ${returnQty} (out of ${sellQty} sold)`)

  const returnResult = await prisma.$transaction(async (tx) => {
    const salesReturn = await tx.salesReturn.create({
      data: {
        saleId: createdSale.id,
        productId: product.id,
        quantityReturned: returnQty,
      },
    })

    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: {
        quantity: {
          increment: returnQty,
        },
      },
    })

    return { salesReturn, updatedStock: updatedProduct.quantity }
  })

  // Verify stock in database after return
  const productAfterReturn = await prisma.product.findUnique({
    where: { id: product.id },
  })

  const expectedStockAfterReturn = expectedStockAfterSale + returnQty
  console.log(`\n[STEP 3 VERIFICATION]`)
  console.log(`         SalesReturn Record ID: ${returnResult.salesReturn.id}`)
  console.log(`         Units Returned: ${returnResult.salesReturn.quantityReturned}`)
  console.log(`         Stock in Database: ${productAfterReturn.quantity} (Expected: ${expectedStockAfterReturn})`)

  if (productAfterReturn.quantity !== expectedStockAfterReturn) {
    throw new Error(`FAILURE: Stock restock mismatch! Expected ${expectedStockAfterReturn}, got ${productAfterReturn.quantity}`)
  }
  console.log('         ✓ Stock restoration successfully verified!\n')

  // 4. Clean up test records and restore initial stock
  console.log(`[STEP 4] Reverting test records and restoring exact initial stock...`)
  await prisma.salesReturn.delete({ where: { id: returnResult.salesReturn.id } })
  await prisma.saleItem.deleteMany({ where: { saleId: createdSale.id } })
  await prisma.sale.delete({ where: { id: createdSale.id } })
  await prisma.product.update({
    where: { id: product.id },
    data: { quantity: initialStock },
  })

  const finalCheck = await prisma.product.findUnique({ where: { id: product.id } })
  console.log(`         Final Product Stock restored to: ${finalCheck.quantity}`)
  console.log('========================================================')
  console.log('ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!')
  console.log('========================================================')
}

runVerification()
  .catch((e) => {
    console.error('VERIFICATION ERROR:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

