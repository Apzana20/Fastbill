import prisma from '@/lib/prisma'
import { addOrUpdateProductStock } from '../actions'
import ProductTable from './ProductTable'

export const dynamic = 'force-dynamic'

export default async function PurchasePage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const totalStock = products.reduce((acc, p) => acc + p.quantity, 0)

  // Serialize products for the client component (plain objects)
  const serializedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    mrp: p.mrp,
    price1: p.price1,
    price2: p.price2,
    price3: p.price3,
  }))

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-800 p-6 sm:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <header className="border-b border-stone-200/70 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Purchases &amp; Stock Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Add new products or replenish existing inventory with multi-tier pricing
            </p>
          </div>
          <div className="flex gap-4 text-xs sm:text-sm">
            <div className="bg-white px-4 py-2 rounded-xl border border-stone-200/70 shadow-soft">
              <span className="text-slate-400">Total Products: </span>
              <span className="font-bold text-slate-800">{products.length}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-sage-200/70 bg-sage-50/20 shadow-soft">
              <span className="text-slate-400">Total Units: </span>
              <span className="font-bold text-sage-700">{totalStock}</span>
            </div>
          </div>
        </header>

        {/* Product Purchase & Stock Entry Form */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/70 shadow-soft space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Add or Replenish Stock
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter a new product name to create it, or enter an existing product name to automatically add to its current stock.
            </p>
          </div>

          <form action={addOrUpdateProductStock} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
              {/* Product Name */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  list="product-suggestions"
                  placeholder="e.g. PVC Pipe 1 inch"
                  className="w-full px-3.5 py-2.5 border border-stone-200/80 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-500 transition-all shadow-soft-xs hover:border-stone-300"
                />
                <datalist id="product-suggestions">
                  {products.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Autocompletes existing products
                </span>
              </div>

              {/* Initial / Newly Added Quantity */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Initial Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 20"
                  defaultValue="10"
                  className="w-full px-3.5 py-2.5 border border-stone-200/80 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-500 transition-all shadow-soft-xs hover:border-stone-300"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Adds to existing if exists
                </span>
              </div>

              {/* MRP */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  MRP (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  name="mrp"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  defaultValue="299.00"
                  className="w-full px-3.5 py-2.5 border border-stone-200/80 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-500 transition-all shadow-soft-xs hover:border-stone-300"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Maximum Retail Price
                </span>
              </div>

              {/* Price 1 */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Price 1 (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  name="price1"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  defaultValue="249.00"
                  className="w-full px-3.5 py-2.5 border border-stone-200/80 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-500 transition-all shadow-soft-xs hover:border-stone-300"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tier 1 / Retail
                </span>
              </div>

              {/* Price 2 */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Price 2 (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  name="price2"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  defaultValue="219.00"
                  className="w-full px-3.5 py-2.5 border border-stone-200/80 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-500 transition-all shadow-soft-xs hover:border-stone-300"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tier 2 / Wholesale
                </span>
              </div>

              {/* Price 3 */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Price 3 (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  name="price3"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  defaultValue="189.00"
                  className="w-full px-3.5 py-2.5 border border-stone-200/80 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-500 transition-all shadow-soft-xs hover:border-stone-300"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tier 3 / Special Dealer
                </span>
              </div>

              {/* Submit Button */}
              <div className="lg:col-span-4 flex items-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-2.5 bg-sage-600 hover:bg-sage-700 text-white font-semibold rounded-xl text-sm transition-all shadow-soft hover:shadow-sage-600/20 active:scale-[0.98]"
                >
                  Save Product / Add Stock
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Inventory Products Table (Client Component with Delete) */}
        <ProductTable initialProducts={serializedProducts} />
      </div>
    </main>
  )
}
