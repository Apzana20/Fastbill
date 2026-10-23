// API route to delete a product by its numeric ID
import { NextResponse } from 'next/server'
import { deleteProduct } from '@/app/actions'

export async function POST(request: Request) {
  try {
    const { productId } = await request.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }
    await deleteProduct(productId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}

