'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

export interface InventoryProduct {
  id: string
  name: string
  quantity: number
  mrp: number
  price1: number
  price2: number
  price3: number
  createdAt: string | Date
}

export default function InventoryClient({
  initialProducts,
}: {
  initialProducts: InventoryProduct[]
}) {
  const [products, setProducts] = useState<InventoryProduct[]>(initialProducts)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return
    setDeletingId(productId)
    try {
      const res = await fetch('/api/deleteProduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (!res.ok) throw new Error('Server error')
      setProducts((prev) => prev.filter((p) => p.id !== productId))
    } catch (e) {
      console.error(e)
      alert('Failed to delete product')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase().trim()
    return products.filter((p) => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
  }, [products, searchQuery])

  const totalStock = useMemo(() => products.reduce((sum, p) => sum + p.quantity, 0), [products])
  const totalValuation = useMemo(() => products.reduce((sum, p) => sum + p.quantity * p.price1, 0), [products])

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-800 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-stone-200/70 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Inventory Catalog</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sage-100 text-sage-800 border border-sage-200/80">Numeric IDs</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Active stock catalog with numeric inventory IDs (1001, 1002, ...), live quantity, and price tiers</p>
          </div>
          <Link href="/purchase" className="px-4 py-2 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold shadow-soft-xs transition-all flex items-center gap-1.5">
            + Add / Replenish Stock
          </Link>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Products</span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{products.length}</p>
            </div>
            <span className="p-3 bg-sage-50 text-sage-700 rounded-xl text-xl border border-sage-200/60">📦</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total In-Stock Units</span>
              <p className="text-2xl font-black font-mono text-slate-900 mt-0.5">{totalStock}</p>
            </div>
            <span className="p-3 bg-mint-50 text-mint-700 rounded-xl text-xl border border-mint-200/60">📊</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Inventory Valuation (Price 1)</span>
              <p className="text-2xl font-black font-mono text-slate-900 mt-0.5">₹{totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <span className="p-3 bg-lavender-50 text-lavendar-700 rounded-xl text-xl border border-lavender-200/60">💎</span>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-soft">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Search Inventory by Numeric Product ID or Product Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. 1001 or PVC Pipe..." className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-200/80 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-500 transition-all text-slate-800 placeholder-slate-400 shadow-soft-xs hover:border-stone-300"/>
            {searchQuery && (<button type="button" onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-semibold">Clear</button>)}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200/70 bg-[#fbfdfb] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Products Matrix</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sage-50 text-sage-700 border border-sage-200/60">{filteredProducts.length} items</span>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm"><span className="text-3xl block mb-2">📦</span>No inventory products found matching “{searchQuery}”.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-sage-700 border-collapse">
                <thead className="bg-[#f8faf8] text-[11px] uppercase font-bold text-slate-500 border-b border-stone-200/80 tracking-wider">
                  <tr>
                    <th className="py-3 px-5 w-32">Inventory ID</th>
                    <th className="py-3 px-5">Product Name</th>
                    <th className="py-3 px-5 text-center">Stock Level</th>
                    <th className="py-3 px-5 text-right">MRP (₹)</th>
                    <th className="py-3 px-5 text-right">Price 1 (₹)</th>
                    <th className="py-3 px-5 text-right">Price 2 (₹)</th>
                    <th className="py-3 px-5 text-right">Price 3 (₹)</th>
                    <th className="py-3 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-sage-50/25 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-xs font-black text-slate-900 select-all"><span className="bg-sage-50 text-sage-800 px-2.5 py-1 rounded-md border border-sage-200/70 inline-block font-mono">#{product.id}</span></td>
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{product.name}</td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${product.quantity > 10 ? 'bg-mint-50 text-mint-800 border border-mint-200/70' : product.quantity > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200/70' : 'bg-rose-50 text-rose-800 border border-rose-200/70'}`}> 
                          <span className={`w-1.5 h-1.5 rounded-full ${product.quantity > 10 ? 'bg-mint-500' : product.quantity > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                          {product.quantity} units
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-500">₹{product.mrp.toFixed(2)}</td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-sage-700">₹{product.price1.toFixed(2)}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-800">₹{product.price2.toFixed(2)}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-800">₹{product.price3.toFixed(2)}</td>
                      <td className="py-3.5 px-5 text-center">
                        <button type="button" onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} className="text-red-600 hover:text-red-800 focus:outline-none" title="Delete product">
                          {deletingId === product.id ? '⏳' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
