'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { generateSaleBill, SaleBillItemInput } from '../actions'

interface Product {
  id: string
  name: string
  quantity: number
  mrp: number
  price1: number
  price2: number
  price3: number
}

type PriceTierMode = 'custom' | 'price1' | 'price2' | 'price3' | 'mrp'

interface GridRow {
  rowId: string
  productQuery: string
  productId: string
  productName: string
  availableStock: number
  mrp: number
  price1: number
  price2: number
  price3: number
  selectedPriceTier: PriceTierMode
  unitPriceInput: string // Unlocked & blank by default for Custom
  selectedPrice: number // Effective price for subtotal calculation
  isPriceLocked: boolean // Locked when P1, P2, P3, or MRP is chosen
  quantity: string // Defaults to '0'
  isDropdownOpen: boolean
  highlightedIndex: number
}

interface CompletedSale {
  id: string
  saleNumber: string
  customerName?: string | null
  customerPhone?: string | null
  totalAmount: number
  createdAt: string | Date
  items: Array<{
    id: string
    productId: string
    quantity: number
    selectedPrice: number
    subtotal: number
    product: {
      name: string
    }
  }>
}

function createEmptyRow(): GridRow {
  return {
    rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productQuery: '',
    productId: '',
    productName: '',
    availableStock: 0,
    mrp: 0,
    price1: 0,
    price2: 0,
    price3: 0,
    selectedPriceTier: 'custom',
    unitPriceInput: '', // Blank by default
    selectedPrice: 0,
    isPriceLocked: false, // Unlocked by default
    quantity: '0', // Default quantity 0
    isDropdownOpen: false,
    highlightedIndex: 0,
  }
}

export default function SalesBillingClient({
  initialProducts,
}: {
  initialProducts: Product[]
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [rows, setRows] = useState<GridRow[]>([createEmptyRow()])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)

  // Input refs for keyboard navigation
  const productInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const priceInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Focus the first row's product input on mount
  useEffect(() => {
    if (rows.length > 0) {
      const firstId = rows[0].rowId
      productInputRefs.current[firstId]?.focus()
    }
  }, [])

  // Helper: Automatically appends a brand new blank row at the bottom of the grid and immediately shifts focus to the new product input field
  function addNewRowAndFocus(): string {
    const newRow = createEmptyRow()
    setRows((prev) => {
      // If the last row is already a pristine empty row (no product selected, no query), just focus it
      const lastRow = prev[prev.length - 1]
      if (lastRow && !lastRow.productId && !lastRow.productQuery.trim()) {
        setTimeout(() => {
          productInputRefs.current[lastRow.rowId]?.focus()
        }, 30)
        return prev
      }

      setTimeout(() => {
        productInputRefs.current[newRow.rowId]?.focus()
      }, 30)
      return [...prev, newRow]
    })
    return newRow.rowId
  }

  // Update a specific row
  function updateRow(rowId: string, updates: Partial<GridRow>) {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, ...updates } : r))
    )
  }

  // Filter matching products for a search query
  function getMatchingProducts(query: string) {
    if (!query.trim()) return []
    const q = query.toLowerCase().trim()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }

  // Handle typing in product name cell: opens visible floating dropdown directly underneath the row
  function handleProductQueryChange(rowId: string, query: string) {
    const matching = getMatchingProducts(query)
    updateRow(rowId, {
      productQuery: query,
      isDropdownOpen: query.trim().length > 0 && matching.length > 0,
      highlightedIndex: 0,
      // If user completely clears text, reset product data
      ...(query.trim() === ''
        ? {
            productId: '',
            productName: '',
            availableStock: 0,
            mrp: 0,
            price1: 0,
            price2: 0,
            price3: 0,
            selectedPriceTier: 'custom',
            unitPriceInput: '',
            selectedPrice: 0,
            isPriceLocked: false,
            quantity: '0',
          }
        : {}),
    })
  }

  // Select a product from dropdown or autocomplete
  function selectProductForRow(
    rowId: string,
    product: Product,
    autoAppendNewRow: boolean = false
  ) {
    updateRow(rowId, {
      productId: product.id,
      productName: product.name,
      productQuery: product.name,
      availableStock: product.quantity,
      mrp: product.mrp,
      price1: product.price1,
      price2: product.price2,
      price3: product.price3,
      // Default to Custom mode
      selectedPriceTier: 'custom',
      // Leave unit price completely blank & unlocked so user can immediately type
      unitPriceInput: '',
      selectedPrice: 0,
      isPriceLocked: false,
      // Default quantity to 0
      quantity: '0',
      isDropdownOpen: false,
      highlightedIndex: 0,
    })

    if (autoAppendNewRow) {
      // Instant Enter key row creation on selection: appends a brand new blank row and shifts focus
      setTimeout(() => {
        addNewRowAndFocus()
      }, 50)
    } else {
      // Mouse click on suggestion: automatically focus price field ready for entry
      setTimeout(() => {
        priceInputRefs.current[rowId]?.focus()
      }, 50)
    }
  }

  // Click on a price tier pill button (Custom, P1, P2, P3, MRP)
  function handleTierClick(rowId: string, tier: PriceTierMode) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r

        if (tier === 'custom') {
          // Clicking Custom unlocks and clears the box for manual entry
          return {
            ...r,
            selectedPriceTier: 'custom',
            unitPriceInput: '',
            selectedPrice: 0,
            isPriceLocked: false,
          }
        }

        // Clicking any fixed tier pill (P1, P2, P3, MRP) populates that tier's fixed rate and locks the box
        let fixedRate = 0
        if (tier === 'price1') fixedRate = r.price1
        else if (tier === 'price2') fixedRate = r.price2
        else if (tier === 'price3') fixedRate = r.price3
        else if (tier === 'mrp') fixedRate = r.mrp

        return {
          ...r,
          selectedPriceTier: tier,
          unitPriceInput: fixedRate.toFixed(2),
          selectedPrice: fixedRate,
          isPriceLocked: true,
        }
      })
    )

    if (tier === 'custom') {
      setTimeout(() => {
        priceInputRefs.current[rowId]?.focus()
      }, 50)
    } else {
      // When a fixed tier pill is clicked, focus the quantity input
      setTimeout(() => {
        const qInput = qtyInputRefs.current[rowId]
        if (qInput) {
          qInput.focus()
          qInput.select()
        }
      }, 50)
    }
  }

  // Handle typing custom selling rate
  function handlePriceInputChange(rowId: string, val: string) {
    const parsed = parseFloat(val)
    const eff = !isNaN(parsed) && parsed >= 0 ? parsed : 0
    updateRow(rowId, {
      selectedPriceTier: 'custom',
      unitPriceInput: val,
      selectedPrice: eff,
      isPriceLocked: false,
    })
  }

  // Handle quantity change
  function handleQuantityChange(rowId: string, val: string) {
    updateRow(rowId, { quantity: val })
  }

  // Delete row
  function handleDeleteRow(rowId: string) {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.rowId !== rowId)
      return filtered.length === 0 ? [createEmptyRow()] : filtered
    })
  }

  // Keyboard Navigation on Product Name input:
  // - Arrow Up / Arrow Down navigate through product suggestions
  // - Pressing Enter selects product AND automatically appends a new blank row at bottom
  function handleProductKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    row: GridRow
  ) {
    const matching = getMatchingProducts(row.productQuery)

    if (e.key === 'ArrowDown') {
      if (row.isDropdownOpen && matching.length > 0) {
        e.preventDefault()
        const nextIndex = (row.highlightedIndex + 1) % matching.length
        updateRow(row.rowId, { highlightedIndex: nextIndex })
        return
      }
      if (rowIndex < rows.length - 1) {
        e.preventDefault()
        productInputRefs.current[rows[rowIndex + 1].rowId]?.focus()
      }
    }

    if (e.key === 'ArrowUp') {
      if (row.isDropdownOpen && matching.length > 0) {
        e.preventDefault()
        const prevIndex =
          (row.highlightedIndex - 1 + matching.length) % matching.length
        updateRow(row.rowId, { highlightedIndex: prevIndex })
        return
      }
      if (rowIndex > 0) {
        e.preventDefault()
        productInputRefs.current[rows[rowIndex - 1].rowId]?.focus()
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault()

      // If dropdown is open and has matching items: select highlighted product & append new row at bottom
      if (row.isDropdownOpen && matching.length > 0) {
        const selected = matching[row.highlightedIndex] || matching[0]
        selectProductForRow(row.rowId, selected, true)
        return
      }

      // If typed text matches exactly one product: select it & append new row at bottom
      if (!row.productId && matching.length === 1) {
        selectProductForRow(row.rowId, matching[0], true)
        return
      }

      // Pressing Enter anywhere in the row automatically appends a brand new blank row at the bottom of the grid and immediately shifts focus
      addNewRowAndFocus()
    }

    if (e.key === 'Escape') {
      updateRow(row.rowId, { isDropdownOpen: false })
    }
  }

  // Key navigation on price field: Pressing Enter automatically appends a brand new blank row at bottom
  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addNewRowAndFocus()
    }
  }

  // Key navigation on quantity field: Pressing Enter automatically appends a brand new blank row at bottom
  function handleQtyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addNewRowAndFocus()
    }
  }

  // Filled rows (rows with a selected product)
  const filledRows = useMemo(() => {
    return rows.filter((r) => r.productId.trim() !== '')
  }, [rows])

  // Calculations for filled rows
  const rowCalculations = useMemo(() => {
    return filledRows.map((r) => {
      const parsedQty = parseFloat(r.quantity)
      const isQtyMissing = !r.quantity || r.quantity.trim() === ''
      const isQtyZeroOrLess = isNaN(parsedQty) || parsedQty <= 0
      const isExceeded = !isQtyZeroOrLess && parsedQty > r.availableStock
      const isPriceEmpty = !r.unitPriceInput || r.unitPriceInput.trim() === ''
      const isPriceInvalid = isPriceEmpty || r.selectedPrice <= 0
      const subtotal = !isQtyZeroOrLess && !isPriceInvalid ? r.selectedPrice * parsedQty : 0

      return {
        rowId: r.rowId,
        parsedQty: isQtyZeroOrLess ? 0 : parsedQty,
        isQtyMissing,
        isQtyZeroOrLess,
        isExceeded,
        isPriceEmpty,
        isPriceInvalid,
        subtotal: Number(subtotal.toFixed(2)),
      }
    })
  }, [filledRows])

  // Dynamic Grand Total & Totals
  const grandTotal = useMemo(() => {
    return rowCalculations.reduce((sum, item) => sum + item.subtotal, 0)
  }, [rowCalculations])

  const totalUnits = useMemo(() => {
    return rowCalculations.reduce((sum, item) => sum + item.parsedQty, 0)
  }, [rowCalculations])

  const hasInvalidItems = useMemo(() => {
    if (filledRows.length === 0) return true
    return rowCalculations.some(
      (c) => c.isQtyZeroOrLess || c.isExceeded || c.isPriceInvalid
    )
  }, [filledRows, rowCalculations])

  // Submit and Generate Bill
  async function handleGenerateBill() {
    if (hasInvalidItems || filledRows.length === 0) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const itemsPayload: SaleBillItemInput[] = filledRows.map((row) => {
        const qty = parseFloat(row.quantity)
        const sub = Number((row.selectedPrice * qty).toFixed(2))
        return {
          productId: row.productId,
          quantity: qty,
          selectedPrice: row.selectedPrice,
          subtotal: sub,
        }
      })

      const res = await generateSaleBill(itemsPayload, {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      })

      if (res.success && res.sale) {
        // Deduct inventory locally
        setProducts((prev) =>
          prev.map((prod) => {
            const soldItem = itemsPayload.find((it) => it.productId === prod.id)
            if (soldItem) {
              return {
                ...prod,
                quantity: Math.max(0, prod.quantity - soldItem.quantity),
              }
            }
            return prod
          })
        )

        // Reset grid to a single fresh empty row and clear customer details
        setRows([createEmptyRow()])
        setCustomerName('')
        setCustomerPhone('')
        // Show printable invoice modal
        setCompletedSale(res.sale as CompletedSale)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to generate sale bill. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-800 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-stone-200/70 gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Sales &amp; Billing
              </h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sage-100 text-sage-800 border border-sage-200/80">
                Excel Spreadsheet Grid
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Type product names inline. Suggestions float directly underneath. Press <kbd className="px-1.5 py-0.5 rounded bg-stone-200/80 text-slate-700 text-xs font-mono font-semibold">Enter</kbd> anywhere in a row to automatically add a new row at the bottom.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-lavender-50 text-lavender-700 border border-lavender-200/70 shadow-soft-xs">
              {products.length} Products Catalogued
            </span>
          </div>
        </div>

        {/* Optional Customer Information Card */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-soft print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 flex items-center justify-center text-lg border border-sage-200/60 shadow-soft-xs">
                👤
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Customer Details</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    Optional
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Attach customer information to save with this transaction and display on invoice
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[480px]">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200/80 bg-stone-50/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-500 transition-all text-slate-800 placeholder-slate-400 shadow-soft-xs hover:border-stone-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200/80 bg-stone-50/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-500 transition-all text-slate-800 placeholder-slate-400 shadow-soft-xs hover:border-stone-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-sm flex items-center justify-between shadow-soft animate-fadeIn print:hidden">
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

        {/* Excel Spreadsheet Card with OVERFLOW-VISIBLE so dropdown is never clipped */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-soft overflow-visible print:hidden">
          {/* Grid Toolbar */}
          <div className="px-6 py-3.5 border-b border-stone-200/70 bg-[#fbfdfb] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Billing Grid
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sage-50 text-sage-700 border border-sage-200/60">
                {filledRows.length} {filledRows.length === 1 ? 'item' : 'items'} in bill
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addNewRowAndFocus()}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-white shadow-soft-xs transition-all flex items-center gap-1.5"
                title="Add a new blank line (or press Enter anywhere in a row)"
              >
                <span>+ Add Row</span>
                <kbd className="text-[10px] bg-sage-700 px-1 py-0.2 rounded text-sage-100">↵ Enter</kbd>
              </button>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows([createEmptyRow()])}
                  className="text-xs font-medium text-slate-400 hover:text-rose-600 px-2 py-1 transition-colors"
                >
                  Clear Grid
                </button>
              )}
            </div>
          </div>

          {/* Spreadsheet Table Container with OVERFLOW-VISIBLE (prevents dropdown from being clipped) */}
          <div className="overflow-visible min-w-full">
            <table className="w-full text-left text-sm text-slate-700 border-collapse">
              <thead className="bg-[#f8faf8] text-[11px] uppercase font-bold text-slate-500 border-b border-stone-200/80 tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-12 text-center border-r border-stone-200/60">#</th>
                  <th className="py-3 px-4 min-w-[300px] border-r border-stone-200/60">Product Name</th>
                  <th className="py-3 px-3 w-28 text-center border-r border-stone-200/60">Stock</th>
                  <th className="py-3 px-4 min-w-[340px] border-r border-stone-200/60">Price Option Pills</th>
                  <th className="py-3 px-3 w-32 text-right border-r border-stone-200/60">Unit Price (₹)</th>
                  <th className="py-3 px-3 w-24 text-center border-r border-stone-200/60">Qty</th>
                  <th className="py-3 px-4 w-32 text-right border-r border-stone-200/60">Subtotal (₹)</th>
                  <th className="py-3 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 overflow-visible">
                {rows.map((row, index) => {
                  const calc = rowCalculations.find((c) => c.rowId === row.rowId)
                  const matching = getMatchingProducts(row.productQuery)
                  const isFilled = Boolean(row.productId)

                  return (
                    <tr
                      key={row.rowId}
                      style={{ zIndex: row.isDropdownOpen ? 60 : rows.length - index }}
                      className={`transition-colors relative ${
                        row.isDropdownOpen ? 'z-50' : 'z-10'
                      } ${isFilled ? 'hover:bg-sage-50/20' : 'bg-stone-50/20'}`}
                    >
                      {/* Row Index */}
                      <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-400 font-medium border-r border-stone-100 bg-stone-50/40 select-none">
                        {index + 1}
                      </td>

                      {/* Inline Product Search with Floating Dropdown Directly Underneath */}
                      <td
                        className={`py-2 px-3 border-r border-stone-100 relative ${
                          row.isDropdownOpen ? 'z-50' : 'z-10'
                        }`}
                      >
                        <div className="relative">
                          <input
                            ref={(el) => {
                              productInputRefs.current[row.rowId] = el
                            }}
                            type="text"
                            value={row.productQuery}
                            onChange={(e) =>
                              handleProductQueryChange(row.rowId, e.target.value)
                            }
                            onFocus={() => {
                              if (row.productQuery.trim().length > 0) {
                                updateRow(row.rowId, { isDropdownOpen: true })
                              }
                            }}
                            onKeyDown={(e) => handleProductKeyDown(e, index, row)}
                            placeholder="Type product name (e.g. PVC Pipe, Wall Putty)..."
                            className={`w-full px-3 py-1.5 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                              isFilled
                                ? 'border-stone-200/80 bg-white font-medium text-slate-900 focus:ring-sage-300 focus:border-sage-500'
                                : 'border-stone-200/80 bg-stone-50/30 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-sage-300 focus:border-sage-500'
                            }`}
                          />

                          {/* Live Autocomplete Dropdown List directly underneath active row (z-50 overlay) */}
                          {row.isDropdownOpen && matching.length > 0 && (
                            <div className="absolute left-0 top-full mt-1.5 w-full min-w-[420px] max-w-lg z-50 bg-white rounded-xl border border-stone-200/90 shadow-soft-lg divide-y divide-stone-100 max-h-72 overflow-y-auto">
                              {matching.map((p, mIdx) => {
                                const isHighlighted = mIdx === row.highlightedIndex
                                const isOut = p.quantity <= 0
                                return (
                                  <div
                                    key={p.id}
                                    onMouseDown={(e) => {
                                      // onMouseDown fires before blur to prevent premature hiding
                                      e.preventDefault()
                                      selectProductForRow(row.rowId, p, false)
                                    }}
                                    className={`p-3 cursor-pointer text-xs flex items-center justify-between transition-colors ${
                                      isHighlighted
                                        ? 'bg-sage-100/90 text-sage-950 font-semibold'
                                        : 'hover:bg-sage-50/70 text-slate-800'
                                    }`}
                                  >
                                    <div>
                                      <span className="font-semibold text-sm text-slate-900 block">
                                        {p.name}
                                      </span>
                                      <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                                        MRP: ₹{p.mrp.toFixed(2)} • P1: ₹{p.price1.toFixed(2)} • P2: ₹{p.price2.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isOut ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                          Out of Stock
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-mint-50 text-mint-800 border border-mint-200/70">
                                          {p.quantity} in stock
                                        </span>
                                      )}
                                      <span className="text-sage-700 font-bold text-xs bg-sage-50 px-2 py-1 rounded border border-sage-200/60">
                                        Select ↵
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Available Stock Levels */}
                      <td className="py-2 px-3 text-center border-r border-stone-100">
                        {isFilled ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              row.availableStock > 10
                                ? 'bg-mint-50 text-mint-800 border border-mint-200/70'
                                : row.availableStock > 0
                                ? 'bg-amber-50 text-amber-800 border border-amber-200/70'
                                : 'bg-rose-50 text-rose-800 border border-rose-200/70'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                row.availableStock > 10
                                  ? 'bg-mint-500'
                                  : row.availableStock > 0
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            ></span>
                            {row.availableStock} in stock
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Price Option Pills (Custom, P1, P2, P3, MRP side-by-side) */}
                      <td className="py-2 px-3 border-r border-stone-100">
                        {isFilled ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Custom Pill (Default) */}
                            <button
                              type="button"
                              onClick={() => handleTierClick(row.rowId, 'custom')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                                row.selectedPriceTier === 'custom'
                                  ? 'bg-lavender-600 text-white border-lavender-600 shadow-soft-xs'
                                  : 'bg-white text-lavender-700 border-lavender-200 hover:bg-lavender-50'
                              }`}
                              title="Custom selling rate (unlocked and cleared for direct entry)"
                            >
                              <span>Custom</span>
                              {row.selectedPriceTier === 'custom' && (
                                <span className="text-[10px] opacity-80">✎</span>
                              )}
                            </button>

                            {/* P1 Pill */}
                            <button
                              type="button"
                              onClick={() => handleTierClick(row.rowId, 'price1')}
                              className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                                row.selectedPriceTier === 'price1'
                                  ? 'bg-sage-600 text-white border-sage-600 shadow-soft-xs font-semibold'
                                  : 'bg-white text-slate-700 border-stone-200/80 hover:bg-sage-50/60'
                              }`}
                              title={`Price 1 (Retail): ₹${row.price1.toFixed(2)}`}
                            >
                              P1: ₹{row.price1.toFixed(2)}
                            </button>

                            {/* P2 Pill */}
                            <button
                              type="button"
                              onClick={() => handleTierClick(row.rowId, 'price2')}
                              className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                                row.selectedPriceTier === 'price2'
                                  ? 'bg-sage-600 text-white border-sage-600 shadow-soft-xs font-semibold'
                                  : 'bg-white text-slate-700 border-stone-200/80 hover:bg-sage-50/60'
                              }`}
                              title={`Price 2 (Wholesale): ₹${row.price2.toFixed(2)}`}
                            >
                              P2: ₹{row.price2.toFixed(2)}
                            </button>

                            {/* P3 Pill */}
                            <button
                              type="button"
                              onClick={() => handleTierClick(row.rowId, 'price3')}
                              className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                                row.selectedPriceTier === 'price3'
                                  ? 'bg-sage-600 text-white border-sage-600 shadow-soft-xs font-semibold'
                                  : 'bg-white text-slate-700 border-stone-200/80 hover:bg-sage-50/60'
                              }`}
                              title={`Price 3 (Special): ₹${row.price3.toFixed(2)}`}
                            >
                              P3: ₹{row.price3.toFixed(2)}
                            </button>

                            {/* MRP Pill */}
                            <button
                              type="button"
                              onClick={() => handleTierClick(row.rowId, 'mrp')}
                              className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                                row.selectedPriceTier === 'mrp'
                                  ? 'bg-sage-600 text-white border-sage-600 shadow-soft-xs font-semibold'
                                  : 'bg-white text-slate-700 border-stone-200/80 hover:bg-sage-50/60'
                              }`}
                              title={`Maximum Retail Price: ₹${row.mrp.toFixed(2)}`}
                            >
                              MRP: ₹{row.mrp.toFixed(2)}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Unit Price Field (Unlocked & Blank by default for Custom, Locked for fixed tiers) */}
                      <td className="py-2 px-3 text-right border-r border-stone-100">
                        {isFilled ? (
                          <div className="flex flex-col items-end">
                            <div className="relative inline-block w-28">
                              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-mono select-none pointer-events-none">
                                ₹
                              </span>
                              <input
                                ref={(el) => {
                                  priceInputRefs.current[row.rowId] = el
                                }}
                                type="number"
                                step="0.01"
                                min="0"
                                readOnly={row.isPriceLocked}
                                value={row.unitPriceInput}
                                onChange={(e) =>
                                  handlePriceInputChange(row.rowId, e.target.value)
                                }
                                onKeyDown={handlePriceKeyDown}
                                placeholder="0.00"
                                className={`w-full pl-6 pr-2 py-1 text-xs font-mono font-bold text-right rounded-lg border transition-all focus:outline-none ${
                                  row.isPriceLocked
                                    ? 'bg-stone-100 text-slate-700 border-stone-200 cursor-not-allowed select-none'
                                    : calc?.isPriceInvalid && row.unitPriceInput !== ''
                                    ? 'border-rose-400 bg-rose-50 text-rose-800'
                                    : 'border-lavender-300 bg-white text-slate-900 focus:ring-2 focus:ring-lavender-400 focus:border-lavender-500 shadow-soft-xs'
                                }`}
                              />
                            </div>
                            <span className="text-[10px] mt-0.5 font-medium">
                              {row.isPriceLocked ? (
                                <span className="text-slate-400 flex items-center gap-1">
                                  🔒 Locked
                                </span>
                              ) : (
                                <span className="text-lavender-700">
                                  ✎ Custom Rate
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Quantity Input (Defaults to 0 for manual editing) */}
                      <td className="py-2 px-3 border-r border-stone-100">
                        {isFilled ? (
                          <div>
                            <input
                              ref={(el) => {
                                qtyInputRefs.current[row.rowId] = el
                              }}
                              type="number"
                              min="0"
                              max={row.availableStock}
                              value={row.quantity}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                handleQuantityChange(row.rowId, e.target.value)
                              }
                              onKeyDown={handleQtyKeyDown}
                              className={`w-20 px-2 py-1 text-center font-bold text-xs rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                                calc?.isExceeded
                                  ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-300 animate-pulse'
                                  : calc?.isQtyZeroOrLess
                                  ? 'border-amber-300 bg-amber-50/50 text-amber-900 focus:ring-amber-300'
                                  : 'border-stone-200/80 bg-white text-slate-900 focus:ring-sage-300 focus:border-sage-500'
                              }`}
                            />
                            {calc?.isExceeded && (
                              <span className="text-[10px] text-rose-600 font-semibold block text-center mt-0.5">
                                Max {row.availableStock}
                              </span>
                            )}
                            {calc?.isQtyZeroOrLess && !calc.isExceeded && (
                              <span className="text-[10px] text-amber-700 font-medium block text-center mt-0.5">
                                Enter qty
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs text-center block">—</span>
                        )}
                      </td>

                      {/* Row Subtotal */}
                      <td className="py-2 px-4 text-right font-mono font-extrabold text-sage-800 border-r border-stone-100">
                        {isFilled ? `₹${(calc?.subtotal || 0).toFixed(2)}` : '—'}
                      </td>

                      {/* Delete Row */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.rowId)}
                          className="p-1 text-slate-300 hover:text-rose-500 transition-colors text-sm"
                          title="Delete line"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Toolbar */}
          <div className="px-6 py-3 border-t border-stone-100 bg-[#fbfdfb] flex items-center justify-between">
            <button
              type="button"
              onClick={() => addNewRowAndFocus()}
              className="text-xs font-semibold text-sage-700 hover:text-sage-800 hover:bg-sage-50 px-3 py-1.5 rounded-lg border border-dashed border-sage-300 transition-all flex items-center gap-1.5"
            >
              <span>+ Add Row (or press Enter in any field)</span>
            </button>
            <span className="text-xs text-slate-400 font-medium">
              💡 Arrow keys navigate dropdown • Enter anywhere in row appends new row at bottom
            </span>
          </div>

          {/* Checkout & Summary Footer Bar */}
          <div className="bg-[#f8faf8] border-t border-stone-200/80 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1 text-xs text-slate-500">
              <p>
                Line Items in Bill:{' '}
                <span className="font-bold text-slate-800">
                  {filledRows.length}
                </span>
              </p>
              <p>
                Total Units Being Sold:{' '}
                <span className="font-bold text-slate-800">
                  {totalUnits}
                </span>
              </p>
              {hasInvalidItems && filledRows.length > 0 && (
                <p className="text-rose-600 font-semibold animate-pulse">
                  * Please ensure every item has a valid price (&gt; ₹0) and quantity (1 - available stock).
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-5">
              <div className="text-right">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">
                  Grand Total
                </span>
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                disabled={hasInvalidItems || isSubmitting}
                onClick={handleGenerateBill}
                className={`px-8 py-3.5 rounded-2xl font-bold text-base shadow-soft-md transition-all flex items-center gap-2 ${
                  hasInvalidItems || isSubmitting
                    ? 'bg-stone-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-sage-600 to-mint-600 hover:from-sage-700 hover:to-mint-700 text-white shadow-sage-600/20 active:scale-[0.98]'
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
                    <span>Generating Bill...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Bill & Print</span>
                    <span>🧾</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Printable Invoice Summary Modal */}
        {completedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto print:static print:bg-transparent print:p-0 print:overflow-visible">
            <div className="bg-white rounded-3xl shadow-soft-lg max-w-2xl w-full p-6 sm:p-8 space-y-6 relative animate-scaleUp border border-stone-200/80 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full print:rounded-none">
              {/* Close Button (Hidden on Print) */}
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
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
                      Fastbill Invoice
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-extrabold text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-md border border-sage-200/70 block">
                      {completedSale.saleNumber}
                    </span>
                    <span className="text-xs text-slate-400 block mt-1">
                      {new Date(completedSale.createdAt).toLocaleString()}
                    </span>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-mint-50 text-mint-800 border border-mint-200/70">
                      PAID / COMPLETED
                    </span>
                  </div>
                </div>

                {/* Customer Details in Printable Receipt (when provided) */}
                {(completedSale.customerName || completedSale.customerPhone) && (
                  <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-200/70 flex flex-wrap justify-between items-center text-xs">
                    {completedSale.customerName && (
                      <div>
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider block">
                          Billed To / Customer
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {completedSale.customerName}
                        </span>
                      </div>
                    )}
                    {completedSale.customerPhone && (
                      <div className="text-right ml-auto">
                        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider block">
                          Contact Number
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          📞 {completedSale.customerPhone}
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
                      {completedSale.items.map((it) => (
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
                  {/* System & Database Messages (Hidden on Print) */}
                  <div className="print:hidden">
                    <p className="text-xs text-slate-500">
                      Stock automatically updated in SQLite database.
                    </p>
                    <p className="text-xs font-semibold text-mint-700 mt-0.5">
                      ✓ Transaction finalized
                    </p>
                  </div>
                  <div className="text-right ml-auto">
                    <span className="text-xs uppercase text-slate-400 font-bold tracking-wider block">
                      Grand Total Amount
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-900">
                      ₹{completedSale.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-center pt-2 text-xs text-slate-400 border-t border-slate-100">
                  Thank you for your purchase!
                </div>
              </div>

              {/* Action Buttons (Hidden when printed) */}
              <div className="print:hidden border-t border-stone-100 pt-4 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCompletedSale(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 text-slate-700 hover:bg-stone-50 text-sm font-semibold transition-colors"
                >
                  Start New Sale
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
                  <span>Print Invoice</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
