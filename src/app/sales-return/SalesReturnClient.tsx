'use client'

import { useState, useMemo } from 'react'
import { processSalesReturn, SalesReturnItemInput } from '../actions'

interface ProductSimple {
  id: string
  name: string
  quantity: number
}

interface Product {
  id: string
  name: string
  quantity: number
  mrp: number
  price1: number
  price2: number
  price3: number
}

interface SaleItemWithProduct {
  id: string
  saleId: string
  productId: string
  quantity: number
  selectedPrice: number
  subtotal: number
  product: Product
}

interface SalesReturnRecord {
  id: string
  saleId: string
  productId: string
  quantityReturned: number
  createdAt: string | Date
  product: Product
  sale?: {
    saleNumber: string
  }
}

interface SaleWithDetails {
  id: string
  saleNumber: string
  customerName?: string | null
  customerPhone?: string | null
  totalAmount: number
  createdAt: string | Date
  items: SaleItemWithProduct[]
  salesReturns: SalesReturnRecord[]
}

interface SelectedReturnItemState {
  productId: string
  selected: boolean
  quantityToReturn: number
}

interface RestockedNotification {
  quantityReturned: number
  newStock: number
  timestamp: number
}

export default function SalesReturnClient({
  initialSales,
  initialReturns,
  initialProducts,
}: {
  initialSales: SaleWithDetails[]
  initialReturns: SalesReturnRecord[]
  initialProducts: ProductSimple[]
}) {
  const [sales, setSales] = useState<SaleWithDetails[]>(initialSales)
  const [returnsHistory, setReturnsHistory] = useState<SalesReturnRecord[]>(initialReturns)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState<string>(
    initialSales[0]?.id || ''
  )
  const [returnItemsState, setReturnItemsState] = useState<
    Record<string, SelectedReturnItemState>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Live product stocks map (productId -> current database quantity)
  const [productStocks, setProductStocks] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const p of initialProducts) {
      map[p.id] = p.quantity
    }
    return map
  })

  // Recently restocked items for visual highlighting
  const [recentlyRestocked, setRecentlyRestocked] = useState<
    Record<string, RestockedNotification>
  >({})

  // Find currently selected sale
  const currentSale = useMemo(() => {
    return sales.find((s) => s.id === selectedSaleId) || null
  }, [sales, selectedSaleId])

  // Filter bills by search query (Sales ID, Customer Name, or Phone Number)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return sales.filter((s) => {
      const matchNumber = s.saleNumber.toLowerCase().includes(q)
      const matchId = s.id.toLowerCase().includes(q)
      const matchName = s.customerName ? s.customerName.toLowerCase().includes(q) : false
      const matchPhone = s.customerPhone ? s.customerPhone.toLowerCase().includes(q) : false
      return matchNumber || matchId || matchName || matchPhone
    })
  }, [searchQuery, sales])

  // Calculate return items details for current selected sale
  const saleItemSummary = useMemo(() => {
    if (!currentSale) return []

    return currentSale.items.map((item) => {
      // Calculate total previously returned quantity for this item in this sale
      const alreadyReturned = currentSale.salesReturns
        .filter((sr) => sr.productId === item.productId)
        .reduce((acc, sr) => acc + sr.quantityReturned, 0)

      const returnable = Math.max(0, item.quantity - alreadyReturned)
      const isFullyReturned = returnable === 0

      const state = returnItemsState[item.productId]
      const isSelected = !!state?.selected && !isFullyReturned
      const qtyToReturn = state?.quantityToReturn || 1
      const refundSubtotal = isSelected ? item.selectedPrice * qtyToReturn : 0

      // Get live stock from productStocks state
      const currentStock = productStocks[item.productId] ?? item.product.quantity
      const restockInfo = recentlyRestocked[item.productId]

      return {
        item,
        alreadyReturned,
        returnable,
        isFullyReturned,
        isSelected,
        qtyToReturn,
        refundSubtotal,
        currentStock,
        restockInfo,
      }
    })
  }, [currentSale, returnItemsState, productStocks, recentlyRestocked])

  // Selected items to submit
  const itemsToSubmit = useMemo(() => {
    return saleItemSummary.filter((s) => s.isSelected && s.qtyToReturn > 0)
  }, [saleItemSummary])

  const totalRefundAmount = useMemo(() => {
    return itemsToSubmit.reduce((acc, it) => acc + it.refundSubtotal, 0)
  }, [itemsToSubmit])

  const totalUnitsReturning = useMemo(() => {
    return itemsToSubmit.reduce((acc, it) => acc + it.qtyToReturn, 0)
  }, [itemsToSubmit])

  // When a bill is selected, clear item selection state
  function handleSelectBill(saleId: string) {
    setSelectedSaleId(saleId)
    setReturnItemsState({})
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  // Toggle item checkbox
  function handleToggleItem(productId: string, defaultReturnableQty: number) {
    setReturnItemsState((prev) => {
      const existing = prev[productId]
      const nextSelected = !existing?.selected
      return {
        ...prev,
        [productId]: {
          productId,
          selected: nextSelected,
          quantityToReturn: existing?.quantityToReturn || Math.min(1, defaultReturnableQty),
        },
      }
    })
  }

  // Handle return quantity change
  function handleQuantityChange(
    productId: string,
    val: number,
    maxReturnable: number
  ) {
    const validQty = Math.max(1, Math.min(val, maxReturnable))
    setReturnItemsState((prev) => ({
      ...prev,
      [productId]: {
        productId,
        selected: true,
        quantityToReturn: validQty,
      },
    }))
  }

  // Submit return to server action
  async function handleSubmitReturn() {
    if (!currentSale || itemsToSubmit.length === 0) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const payload: SalesReturnItemInput[] = itemsToSubmit.map((s) => ({
        saleId: currentSale.id,
        productId: s.item.productId,
        quantityReturned: s.qtyToReturn,
      }))

      const res = await processSalesReturn(payload)

      if (res.success && res.returns) {
        // Update productStocks state directly with new quantities
        const newlyRestockedMap: Record<string, RestockedNotification> = {}

        setProductStocks((prev) => {
          const next = { ...prev }
          for (const ret of res.returns) {
            const prevCount = next[ret.productId] ?? ret.product?.quantity ?? 0
            const updatedCount = prevCount + ret.quantityReturned
            next[ret.productId] = updatedCount

            newlyRestockedMap[ret.productId] = {
              quantityReturned: ret.quantityReturned,
              newStock: updatedCount,
              timestamp: Date.now(),
            }
          }
          return next
        })

        // Update recentlyRestocked for highlighting badges
        setRecentlyRestocked((prev) => ({
          ...prev,
          ...newlyRestockedMap,
        }))

        // Update local sales state so returns reflect in current bill view
        setSales((prevSales) =>
          prevSales.map((sale) => {
            if (sale.id === currentSale.id) {
              return {
                ...sale,
                salesReturns: [
                  ...(res.returns as unknown as SalesReturnRecord[]),
                  ...sale.salesReturns,
                ],
              }
            }
            return sale
          })
        )

        // Prepend to returns history list
        setReturnsHistory((prev) => [
          ...(res.returns as unknown as SalesReturnRecord[]),
          ...prev,
        ])

        // Clear selection state
        setReturnItemsState({})

        // Construct friendly feedback message
        const restockedSummary = res.returns
          .map((it: { product?: { name: string; quantity: number }; productId: string; quantityReturned: number }) => {
            const p = it.product
            return `${p?.name || 'Product'}: +${it.quantityReturned} (Total in Stock: ${
              (productStocks[it.productId] ?? p?.quantity ?? 0) + it.quantityReturned
            })`
          })
          .join(', ')

        setSuccessMessage(
          `Return processed successfully! Restocked: ${restockedSummary}`
        )
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to process sales return.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-800 p-6 sm:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-stone-200/70 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Sales Return & Live Inventory Restocking
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select returned items, view live inventory levels, and automatically restore stock in the SQLite database
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-mint-50/80 text-mint-800 border border-mint-200/70 shadow-soft-xs">
              <span className="w-2 h-2 rounded-full bg-mint-500 animate-pulse"></span>
              Live Database Synced
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-lavender-50 text-lavender-700 border border-lavender-200/70 shadow-soft-xs">
              {returnsHistory.length} Returns Logged
            </span>
          </div>
        </header>

        {/* Success Alert with Live Restock Badge */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-mint-50/80 border border-mint-200/80 text-mint-950 text-sm flex items-center justify-between shadow-soft animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-mint-200/80 text-mint-800 flex items-center justify-center font-bold text-base">
                ✓
              </div>
              <div>
                <p className="font-bold text-mint-950">
                  Stock Restocked Successfully
                </p>
                <p className="text-mint-800 text-xs mt-0.5 font-medium">
                  {successMessage}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-mint-700 hover:text-mint-900 font-bold ml-4 text-base"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-sm flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-800 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section 1: Search by Sales ID, Customer Name, or Phone Number */}
        <section className="bg-white p-6 rounded-2xl border border-stone-200/70 shadow-soft space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Search Bill by Sales ID, Customer Name, or Phone Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Sales ID (e.g., SALE-1001), Customer Name, or Phone Number..."
              className="w-full px-4 py-3 pl-11 text-sm bg-white border border-stone-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-500 transition-all shadow-soft-xs hover:border-stone-300"
            />
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchQuery.trim().length > 0 && (
            <div className="bg-[#fbfdfb] border border-stone-200/80 rounded-xl p-3 max-h-60 overflow-y-auto divide-y divide-stone-100 shadow-soft">
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">
                  No bills found matching &ldquo;{searchQuery}&rdquo;
                </p>
              ) : (
                searchResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectBill(s.id)}
                    className="w-full text-left py-2 px-3 hover:bg-sage-50/60 rounded-lg transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 font-mono">
                        {s.saleNumber}
                      </span>
                      {s.customerName && (
                        <span className="font-semibold text-sage-800 bg-sage-50 px-1.5 py-0.5 rounded border border-sage-200/60 text-[11px]">
                          👤 {s.customerName}
                        </span>
                      )}
                      {s.customerPhone && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          📞 {s.customerPhone}
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px]">ID: {s.id}</span>
                    </div>
                    <div className="font-mono font-semibold text-slate-700 ml-4 shrink-0">
                      ₹{s.totalAmount.toFixed(2)} • {s.items.length} items
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Quick Select Recent Bills */}
          <div className="pt-2">
            <span className="text-xs text-slate-400 font-medium mr-2">
              Quick Select Recent Bills:
            </span>
            <div className="inline-flex gap-2 flex-wrap mt-1">
              {sales.slice(0, 8).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectBill(s.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-mono font-medium border transition-all ${
                    selectedSaleId === s.id
                      ? 'bg-sage-600 text-white border-sage-600 shadow-soft-xs'
                      : 'bg-white text-slate-700 border-stone-200/80 hover:bg-sage-50/60 hover:border-sage-300'
                  }`}
                >
                  {s.saleNumber} {s.customerName ? `(${s.customerName})` : ''} (₹{s.totalAmount.toFixed(2)})
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: Selected Bill Details & Sold Items Table with Live Stock */}
        {currentSale ? (
          <section className="bg-white rounded-2xl border border-stone-200/70 shadow-soft overflow-hidden space-y-6">
            {/* Bill Header Banner */}
            <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-extrabold text-slate-900 font-mono">
                    {currentSale.saleNumber}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-mint-50 text-mint-800 border border-mint-200/70">
                    Original Bill
                  </span>
                </div>
                {(currentSale.customerName || currentSale.customerPhone) && (
                  <p className="text-xs text-slate-700 font-medium mt-1">
                    Customer: <span className="font-bold text-slate-900">{currentSale.customerName || '—'}</span>
                    {currentSale.customerPhone && (
                      <span className="text-slate-500 font-mono ml-2">📞 {currentSale.customerPhone}</span>
                    )}
                  </p>
                )}
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Sale ID: {currentSale.id} • Date:{' '}
                  {new Date(currentSale.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider block">
                  Original Invoice Total
                </span>
                <span className="text-2xl font-black font-mono text-slate-900">
                  ₹{currentSale.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Sold Items Table with Live Stock & Restock Indicators */}
            <div className="px-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Sold Items & Return Selection
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select the check box for items being returned and adjust the quantity.
                  </p>
                </div>
                <div className="text-xs text-slate-500 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200/60">
                  <span>Current live stock displays in real-time</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-stone-200/70 rounded-xl">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#f9faf9] text-xs uppercase font-semibold text-slate-500 border-b border-stone-200/70">
                    <tr>
                      <th className="px-4 py-3.5 text-center">Select</th>
                      <th className="px-4 py-3.5">Product Details & Stock</th>
                      <th className="px-4 py-3.5 text-right">Sold Price</th>
                      <th className="px-4 py-3.5 text-center">Qty Sold</th>
                      <th className="px-4 py-3.5 text-center">Already Returned</th>
                      <th className="px-4 py-3.5 text-center">Available to Return</th>
                      <th className="px-4 py-3.5">Return Qty</th>
                      <th className="px-4 py-3.5 text-right">Refund Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {saleItemSummary.map(
                      ({
                        item,
                        alreadyReturned,
                        returnable,
                        isFullyReturned,
                        isSelected,
                        qtyToReturn,
                        refundSubtotal,
                        currentStock,
                        restockInfo,
                      }) => {
                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-sage-50/40'
                                : isFullyReturned
                                ? 'bg-stone-50/40 opacity-60'
                                : 'hover:bg-sage-50/20'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                disabled={isFullyReturned}
                                checked={isSelected}
                                onChange={() =>
                                  handleToggleItem(item.productId, returnable)
                                }
                                className="w-4 h-4 text-sage-600 rounded border-stone-300 focus:ring-sage-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* Product Name & Live Inventory Level */}
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-900 text-sm">
                                {item.product.name}
                              </div>

                              {/* Live Inventory Status Pill & Dynamic Restock Indicator */}
                              {restockInfo ? (
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-mint-100 text-mint-900 border border-mint-300 animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-mint-500 animate-ping"></span>
                                    Restocked +{restockInfo.quantityReturned} (Total in Stock: {currentStock})
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-1">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      currentStock > 10
                                        ? 'bg-mint-50 text-mint-800 border border-mint-200/70'
                                        : currentStock > 0
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200/70'
                                        : 'bg-rose-50 text-rose-800 border border-rose-200/70'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        currentStock > 10
                                          ? 'bg-mint-500'
                                          : currentStock > 0
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                      }`}
                                    ></span>
                                    Total in Stock: {currentStock} units
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Sold Price */}
                            <td className="px-4 py-4 text-right font-mono font-medium text-slate-900">
                              ₹{item.selectedPrice.toFixed(2)}
                            </td>

                            {/* Qty Sold */}
                            <td className="px-4 py-4 text-center font-mono font-semibold">
                              {item.quantity}
                            </td>

                            {/* Already Returned */}
                            <td className="px-4 py-4 text-center font-mono">
                              {alreadyReturned > 0 ? (
                                <span className="text-amber-700 font-bold">
                                  {alreadyReturned}
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>

                            {/* Available to Return */}
                            <td className="px-4 py-4 text-center">
                              {isFullyReturned ? (
                                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-stone-200 text-slate-600">
                                  Fully Returned
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sage-50 text-sage-800 border border-sage-200/70">
                                  {returnable} units
                                </span>
                              )}
                            </td>

                            {/* Quantity Returning Input */}
                            <td className="px-4 py-4">
                              <input
                                type="number"
                                min="1"
                                max={returnable}
                                disabled={!isSelected || isFullyReturned}
                                value={isSelected ? qtyToReturn : ''}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.productId,
                                    parseInt(e.target.value) || 1,
                                    returnable
                                  )
                                }
                                placeholder="Qty"
                                className={`w-20 px-3 py-1.5 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all ${
                                  isSelected
                                    ? 'border-sage-500 bg-white text-slate-900 focus:ring-sage-300 shadow-soft-xs'
                                    : 'border-stone-200 bg-stone-100 text-slate-400 cursor-not-allowed'
                                }`}
                              />
                            </td>

                            {/* Refund Amount */}
                            <td className="px-4 py-4 text-right font-mono font-bold text-amber-800">
                              ₹{refundSubtotal.toFixed(2)}
                            </td>
                          </tr>
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Return Action Footer */}
            <div className="bg-[#fbfdfb] border-t border-stone-200/70 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-1 text-xs text-slate-500">
                <p>
                  Selected Return Lines:{' '}
                  <span className="font-bold text-slate-800">
                    {itemsToSubmit.length}
                  </span>
                </p>
                <p>
                  Total Return Units:{' '}
                  <span className="font-bold text-slate-800">
                    {totalUnitsReturning}
                  </span>
                </p>
                <p className="text-mint-700 font-semibold">
                  * Stock will automatically increase in the database immediately upon submission.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-5">
                <div className="text-right">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">
                    Total Refund Amount
                  </span>
                  <span className="text-3xl font-extrabold text-amber-700 font-mono">
                    ₹{totalRefundAmount.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={itemsToSubmit.length === 0 || isSubmitting}
                  onClick={handleSubmitReturn}
                  className={`px-8 py-3.5 rounded-2xl font-bold text-base shadow-soft-md transition-all flex items-center gap-2 ${
                    itemsToSubmit.length === 0 || isSubmitting
                      ? 'bg-stone-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 active:scale-[0.98]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Restocking & Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Sales Return & Restock</span>
                      <span>↵</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200/70 p-12 text-center text-slate-400 space-y-2 shadow-soft">
            <p className="text-lg font-bold text-slate-600">No bill selected</p>
            <p className="text-xs">
              Search by Invoice number or select a bill above to view its sold line items and process a return.
            </p>
          </div>
        )}

        {/* Section 3: Recent Returns History Table with Live Stock */}
        <section className="bg-white rounded-2xl border border-stone-200/70 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/40">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Recent Sales Returns History
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit trail of restocked return items with current live inventory
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-slate-600">
              {returnsHistory.length} Recorded
            </span>
          </div>

          {returnsHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No sales returns recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-[#f9faf9] text-xs uppercase font-semibold text-slate-500 border-b border-stone-200/70">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Return ID</th>
                    <th className="px-6 py-3.5 font-semibold">Sale / Bill #</th>
                    <th className="px-6 py-3.5 font-semibold">Product Name</th>
                    <th className="px-6 py-3.5 font-semibold text-center">Returned Qty</th>
                    <th className="px-6 py-3.5 font-semibold text-center">Current Total in Stock</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Return Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {returnsHistory.map((sr) => {
                    const currentStock = productStocks[sr.productId] ?? sr.product?.quantity
                    return (
                      <tr key={sr.id} className="hover:bg-sage-50/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500 select-all">
                          {sr.id}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-sage-800">
                          {sr.sale?.saleNumber || sr.saleId}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {sr.product?.name || 'Product'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                            +{sr.quantityReturned} Restocked
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-slate-800 border border-stone-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-mint-500"></span>
                            Total in Stock: {currentStock} units
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-400">
                          {new Date(sr.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}