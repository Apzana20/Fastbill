'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

export interface SaleItemDetail {
  id: string
  productId: string
  quantity: number
  selectedPrice: number
  subtotal: number
  product: {
    id: string
    name: string
    mrp: number
  }
}

export interface SaleRecord {
  id: string
  saleNumber: string
  customerName?: string | null
  customerPhone?: string | null
  totalAmount: number
  createdAt: string | Date
  items: SaleItemDetail[]
}

export default function SalesHistoryClient({
  initialSales,
}: {
  initialSales: SaleRecord[]
}) {
  const [sales] = useState<SaleRecord[]>(initialSales)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSaleForModal, setSelectedSaleForModal] = useState<SaleRecord | null>(null)

  // Filter sales by Sales ID, Customer Name, or Phone Number
  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales
    const q = searchQuery.toLowerCase().trim()
    return sales.filter((s) => {
      const matchNumber = s.saleNumber.toLowerCase().includes(q)
      const matchId = s.id.toLowerCase().includes(q)
      const matchName = s.customerName ? s.customerName.toLowerCase().includes(q) : false
      const matchPhone = s.customerPhone ? s.customerPhone.toLowerCase().includes(q) : false
      return matchNumber || matchId || matchName || matchPhone
    })
  }, [sales, searchQuery])

  // Total metrics
  const totalRevenue = useMemo(() => {
    return sales.reduce((acc, s) => acc + s.totalAmount, 0)
  }, [sales])

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-800 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-stone-200/70 gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Sales History
              </h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sage-100 text-sage-800 border border-sage-200/80">
                Transactions Archive
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Complete log of all past sales invoices, customer metadata, and re-printable receipts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sales"
              className="px-4 py-2 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold shadow-soft-xs transition-all flex items-center gap-1.5"
            >
              <span>+ New Sale</span>
            </Link>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Total Invoices
              </span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {sales.length}
              </p>
            </div>
            <span className="p-3 bg-sage-50 text-sage-700 rounded-xl text-xl border border-sage-200/60">
              🧾
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Total Billed Revenue
              </span>
              <p className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                ₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <span className="p-3 bg-mint-50 text-mint-700 rounded-xl text-xl border border-mint-200/60">
              💰
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Filtered Matching
              </span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {filteredSales.length} {filteredSales.length === 1 ? 'bill' : 'bills'}
              </p>
            </div>
            <span className="p-3 bg-lavender-50 text-lavender-700 rounded-xl text-xl border border-lavender-200/60">
              🔍
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-soft print:hidden">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Search Invoices by Sales ID, Customer Name, or Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. SALE-1001, Rahul Sharma, or 9876543210..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-200/80 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-500 transition-all text-slate-800 placeholder-slate-400 shadow-soft-xs hover:border-stone-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Sales Table Card */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-soft overflow-hidden print:hidden">
          <div className="px-6 py-4 border-b border-stone-200/70 bg-[#fbfdfb] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Invoices Register
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sage-50 text-sage-700 border border-sage-200/60">
                {filteredSales.length} records
              </span>
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <span className="text-3xl block mb-2">🔍</span>
              {searchQuery ? (
                <>
                  No invoices found matching &ldquo;<span className="font-semibold text-slate-600">{searchQuery}</span>&rdquo;.
                </>
              ) : (
                'No sales transactions found in database.'
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 border-collapse">
                <thead className="bg-[#f8faf8] text-[11px] uppercase font-bold text-slate-500 border-b border-stone-200/80 tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Sales ID</th>
                    <th className="py-3 px-5">Date &amp; Time</th>
                    <th className="py-3 px-5">Customer Name</th>
                    <th className="py-3 px-5">Phone Number</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-5 text-right">Total Amount (₹)</th>
                    <th className="py-3 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredSales.map((sale) => {
                    const totalUnits = sale.items.reduce((sum, it) => sum + it.quantity, 0)
                    return (
                      <tr
                        key={sale.id}
                        className="hover:bg-sage-50/25 transition-colors"
                      >
                        {/* Sales ID */}
                        <td className="py-3.5 px-5 font-mono text-xs font-extrabold text-slate-900">
                          <span className="bg-sage-50 text-sage-800 px-2 py-1 rounded-md border border-sage-200/70 inline-block">
                            {sale.saleNumber}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-5 text-xs text-slate-600">
                          {new Date(sale.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>

                        {/* Customer Name */}
                        <td className="py-3.5 px-5">
                          {sale.customerName ? (
                            <span className="font-semibold text-slate-900">
                              {sale.customerName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              — (Walk-in)
                            </span>
                          )}
                        </td>

                        {/* Phone Number */}
                        <td className="py-3.5 px-5 text-xs font-mono">
                          {sale.customerPhone ? (
                            <span className="text-slate-700 font-medium">
                              📞 {sale.customerPhone}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">
                              —
                            </span>
                          )}
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-slate-600 border border-stone-200/60">
                            {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'} ({totalUnits} units)
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-5 text-right font-mono font-black text-slate-900 text-sm">
                          ₹{sale.totalAmount.toFixed(2)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedSaleForModal(sale)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sage-50 text-sage-700 hover:bg-sage-100 hover:text-sage-800 border border-sage-200/70 text-xs font-bold transition-all shadow-soft-xs active:scale-95"
                          >
                            <span>🧾</span>
                            <span>View / Print</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View / Print Invoice Modal */}
        {selectedSaleForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto print:static print:bg-transparent print:p-0 print:overflow-visible">
            <div className="bg-white rounded-3xl shadow-soft-lg max-w-2xl w-full p-6 sm:p-8 space-y-6 relative animate-scaleUp border border-stone-200/80 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full print:rounded-none">
              {/* Close Button (Hidden on Print) */}
              <button
                type="button"
                onClick={() => setSelectedSaleForModal(null)}
                className="print:hidden absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-lg p-1 rounded-full hover:bg-stone-100"
              >
                ✕
              </button>

              {/* Printable Invoice Card */}
              <div id="printable-invoice" className="space-y-6 bg-white p-2 print:p-0">
                {/* Invoice Header */}
                <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      AN GENERAL TRADING
                    </h2>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Near Govt Hospital, Opp. Market, Kanyakulangara, 695615<br />
                      Trivandrum, Kerala &nbsp;·&nbsp; State Code: 32
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      📞 7356901230 &nbsp;/&nbsp; 04722993300 &nbsp;/&nbsp; 9656301230
                    </p>
                    <p className="text-[11px] text-slate-600">
                      ✉ angeneraltradingvembayam@gmail.com
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wide">
                      Fastbill Invoice Record
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-extrabold text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-md border border-sage-200/70 block">
                      {selectedSaleForModal.saleNumber}
                    </span>
                    <span className="text-xs text-slate-400 block mt-1">
                      {new Date(selectedSaleForModal.createdAt).toLocaleString()}
                    </span>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-mint-50 text-mint-800 border border-mint-200/70">
                      PAID / ARCHIVED
                    </span>
                  </div>
                </div>

                {/* Customer Details in Printable Receipt (when provided) */}
                {(selectedSaleForModal.customerName || selectedSaleForModal.customerPhone) && (
                  <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-200/70 flex flex-wrap justify-between items-center text-xs">
                    {selectedSaleForModal.customerName && (
                      <div>
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider block">
                          Billed To / Customer
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {selectedSaleForModal.customerName}
                        </span>
                      </div>
                    )}
                    {selectedSaleForModal.customerPhone && (
                      <div className="text-right ml-auto">
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider block">
                          Contact Number
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          📞 {selectedSaleForModal.customerPhone}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="border-b border-slate-200 text-xs uppercase font-bold text-slate-400">
                      <tr>
                        <th className="py-2.5">Item Description</th>
                        <th className="py-2.5 text-right">Unit Price</th>
                        <th className="py-2.5 text-center">Qty</th>
                        <th className="py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSaleForModal.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-3 font-medium text-slate-900">
                            {it.product.name}
                          </td>
                          <td className="py-3 text-right font-mono font-medium">
                            ₹{it.selectedPrice.toFixed(2)}
                          </td>
                          <td className="py-3 text-center font-mono">
                            {it.quantity}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-900">
                            ₹{it.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center">
                  <div className="print:hidden">
                    <p className="text-xs text-slate-500">
                      Retrieved from SQLite database sales archive.
                    </p>
                    <p className="text-xs font-semibold text-mint-700 mt-0.5">
                      ✓ Historical record verified
                    </p>
                  </div>
                  <div className="text-right ml-auto">
                    <span className="text-xs uppercase text-slate-400 font-bold tracking-wider block">
                      Grand Total Amount
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-900">
                      ₹{selectedSaleForModal.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-center pt-2 text-xs text-slate-400 border-t border-slate-100">
                  Thank you for your business!
                </div>
              </div>

              {/* Action Buttons (Hidden when printed) */}
              <div className="print:hidden border-t border-stone-100 pt-4 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSaleForModal(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 text-slate-700 hover:bg-stone-50 text-sm font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-sm font-semibold transition-all shadow-soft flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

