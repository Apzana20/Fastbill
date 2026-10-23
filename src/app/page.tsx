import prisma from '@/lib/prisma'
import { recordPurchase, recordSalesReturn, createProduct } from './actions'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [products, sales, salesReturns] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sale.findMany({
      include: {
        items: {
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
    }),
  ])

  const totalStock = products.reduce((acc, p) => acc + p.quantity, 0)
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0)

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-800 p-6 sm:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-stone-200/70 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Billing & Inventory Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Next.js 14 App Router • Tailwind CSS • TypeScript • SQLite • Prisma ORM
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-mint-50/80 text-mint-800 border border-mint-200/70 shadow-soft-xs">
              <span className="h-2 w-2 rounded-full bg-mint-500 animate-pulse"></span>
              SQLite Database Active
            </span>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/70 shadow-soft hover:shadow-soft-md transition-shadow">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Products
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200/70 shadow-soft hover:shadow-soft-md transition-shadow">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Stock In Hand
            </p>
            <p className="text-2xl font-bold text-sage-600 mt-1">{totalStock} units</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200/70 shadow-soft hover:shadow-soft-md transition-shadow">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Sales Revenue
            </p>
            <p className="text-2xl font-bold text-mint-700 mt-1">
              ₹{totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200/70 shadow-soft hover:shadow-soft-md transition-shadow">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sales Returns
            </p>
            <p className="text-2xl font-bold text-lavender-700 mt-1">{salesReturns.length} items</p>
          </div>
        </div>

        {/* Products & Inventory Table */}
        <section className="bg-white rounded-2xl border border-stone-200/70 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/40">
            <h2 className="text-lg font-bold text-slate-900">Products &amp; Inventory</h2>
            <span className="text-xs font-medium text-sage-700 bg-sage-50 px-2.5 py-1 rounded-full border border-sage-200/60">
              Multi-tier pricing enabled
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#f9faf9] text-xs uppercase font-semibold text-slate-500 border-b border-stone-200/70">
                <tr>
                  <th className="px-5 py-3.5">Product Name</th>
                  <th className="px-5 py-3.5 text-center">Stock</th>
                  <th className="px-5 py-3.5 text-right">MRP</th>
                  <th className="px-5 py-3.5 text-right">Price 1</th>
                  <th className="px-5 py-3.5 text-right">Price 2</th>
                  <th className="px-5 py-3.5 text-right">Price 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-sage-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{p.name}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          p.quantity > 5
                            ? 'bg-mint-50 text-mint-800 border border-mint-200/70'
                            : 'bg-amber-50 text-amber-800 border border-amber-200/70'
                        }`}
                      >
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-500">₹{p.mrp.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-sage-700">₹{p.price1.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700">₹{p.price2.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700">₹{p.price3.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Sales List */}
        <section className="bg-white rounded-2xl border border-stone-200/70 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/40">
            <h2 className="text-lg font-bold text-slate-900">Recent Sales & Items</h2>
            <span className="text-xs text-slate-400">Recorded with selected price tier</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#f9faf9] text-xs uppercase font-semibold text-slate-500 border-b border-stone-200/70">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Sale #</th>
                  <th className="px-6 py-3.5 font-semibold">Items Sold</th>
                  <th className="px-6 py-3.5 font-semibold">Unit Price</th>
                  <th className="px-6 py-3.5 font-semibold">Qty</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Total Amount</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-sage-50/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      <span className="bg-sage-50/80 text-sage-900 border border-sage-200/60 px-2 py-0.5 rounded-md">
                        {s.saleNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {s.items.map((it) => (
                        <div key={it.id} className="font-medium text-slate-800">
                          {it.product.name}
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {s.items.map((it) => (
                        <div key={it.id}>₹{it.selectedPrice.toFixed(2)}</div>
                      ))}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {s.items.map((it) => (
                        <div key={it.id}>{it.quantity}</div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-sage-700">
                      ₹{s.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sales Returns */}
        <section className="bg-white rounded-2xl border border-stone-200/70 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/40">
            <h2 className="text-lg font-bold text-slate-900">Sales Returns</h2>
            <span className="text-xs text-slate-400">Items returned & restocked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#f9faf9] text-xs uppercase font-semibold text-slate-500 border-b border-stone-200/70">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Return ID</th>
                  <th className="px-6 py-3.5 font-semibold">Sale #</th>
                  <th className="px-6 py-3.5 font-semibold">Product</th>
                  <th className="px-6 py-3.5 font-semibold">Quantity Returned</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {salesReturns.map((sr) => (
                  <tr key={sr.id} className="hover:bg-sage-50/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{sr.id}</td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">{sr.sale.saleNumber}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{sr.product.name}</td>
                    <td className="px-6 py-4 font-mono font-semibold">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-lavender-50 text-lavender-700 border border-lavender-200/70">
                        +{sr.quantityReturned}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-slate-400">
                      {new Date(sr.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
