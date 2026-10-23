'use client'

import { useState, useTransition } from 'react'

interface Product {
  id: string
  name: string
  quantity: number
  mrp: number
  price1: number
  price2: number
  price3: number
}

export default function ProductTable({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalValuation = products.reduce((acc, p) => acc + p.quantity * p.price1, 0)

  async function handleDelete(productId: string) {
    if (!window.confirm('Are you sure you want to permanently delete this product and all its related records?')) {
      return
    }

    setDeletingId(productId)

    startTransition(async () => {
      try {
        const res = await fetch('/api/deleteProduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        })
        const data = await res.json()

        if (res.ok && data.success) {
          setProducts((prev) => prev.filter((p) => p.id !== productId))
        } else {
          alert(data.error || 'Failed to delete product.')
        }
      } catch (err) {
        console.error('Delete error:', err)
        alert('An unexpected error occurred while deleting the product.')
      } finally {
        setDeletingId(null)
      }
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-stone-200/70 shadow-soft overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-stone-50/40">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Inventory Products</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Current stock status and pricing matrix across all active items
          </p>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <span>Total Stock Valuation (Price 1):</span>
          <span className="font-semibold text-sage-800 bg-sage-50 px-2.5 py-1 rounded-md border border-sage-200/60">
            ₹{totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          No products found in inventory. Use the form above to add your first product!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#f9faf9] text-xs uppercase font-semibold text-slate-500 border-b border-stone-200/70">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Product ID</th>
                <th className="px-6 py-3.5 font-semibold">Name</th>
                <th className="px-6 py-3.5 font-semibold text-center">Total Quantity in Stock</th>
                <th className="px-6 py-3.5 font-semibold text-right">MRP</th>
                <th className="px-6 py-3.5 font-semibold text-right">Price 1</th>
                <th className="px-6 py-3.5 font-semibold text-right">Price 2</th>
                <th className="px-6 py-3.5 font-semibold text-right">Price 3</th>
                <th className="px-6 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((product) => {
                const isDeleting = deletingId === product.id
                return (
                  <tr
                    key={product.id}
                    className={`hover:bg-sage-50/40 transition-colors ${isDeleting ? 'opacity-50' : ''}`}
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 select-all">
                      {product.id}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-900">
                      {product.name}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          product.quantity > 10
                            ? 'bg-mint-50 text-mint-800 border border-mint-200/70'
                            : product.quantity > 0
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/70'
                            : 'bg-rose-50 text-rose-800 border border-rose-200/70'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            product.quantity > 10
                              ? 'bg-mint-500'
                              : product.quantity > 0
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        ></span>
                        {product.quantity} units
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-500">
                      ₹{product.mrp.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right font-mono font-semibold text-sage-700">
                      ₹{product.price1.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-800">
                      ₹{product.price2.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-800">
                      ₹{product.price3.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={isDeleting || isPending}
                        title="Delete product"
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                          isDeleting
                            ? 'bg-slate-100 text-slate-400 cursor-wait'
                            : 'bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 border border-rose-200/60 hover:border-rose-300 active:scale-95'
                        }`}
                      >
                        {isDeleting ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

