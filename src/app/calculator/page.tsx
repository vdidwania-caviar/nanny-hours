"use client";

import { useState, useMemo } from "react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export default function CalculatorPage() {
  const [amount, setAmount] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [vendorPrice, setVendorPrice] = useState("");

  const calculations = useMemo(() => {
    const x = parseFloat(amount) || 0;
    const tax = parseFloat(taxPercent) || 0;
    const discount = parseFloat(discountPercent) || 0;
    const vendor = parseFloat(vendorPrice) || 0;

    // Calculate: (X * (1 + tax%)) * discount%
    const afterTax = x * (1 + tax / 100);
    const discountAmount = afterTax * (discount / 100);
    const finalAmount = afterTax - discountAmount;
    const difference = vendor - finalAmount;
    
    // Calculate commission/below-market percentage
    // If vendor > final: vendor is charging (vendor - final) / final * 100 commission
    // If vendor < final: vendor is (final - vendor) / final * 100 below market
    let commissionPercent = 0;
    if (finalAmount > 0 && vendor > 0) {
      commissionPercent = ((vendor - finalAmount) / finalAmount) * 100;
    }

    return {
      discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
      finalAmount: Number.isFinite(finalAmount) ? finalAmount : 0,
      difference: Number.isFinite(difference) ? difference : 0,
      commissionPercent: Number.isFinite(commissionPercent) ? commissionPercent : 0,
      hasVendorPrice: vendor > 0,
    };
  }, [amount, taxPercent, discountPercent, vendorPrice]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="rounded-3xl bg-slate-900 p-7 text-white shadow-lg shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-300">
            Discount Calculator
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Calculate Discounts
          </h1>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
            Inputs
          </p>

          <div className="mt-4 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-inner">
              <label
                htmlFor="amount"
                className="text-sm font-semibold text-slate-500"
              >
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-semibold text-slate-400">$</span>
                <input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-transparent bg-slate-50 px-4 py-3 text-3xl font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-inner">
              <label
                htmlFor="tax"
                className="text-sm font-semibold text-slate-500"
              >
                Tax Rate (optional)
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="tax"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                  placeholder="8"
                  className="w-full rounded-2xl border border-transparent bg-slate-50 px-4 py-3 text-3xl font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                />
                <span className="text-2xl font-semibold text-slate-400">%</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Enter 8 for 8% tax
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-inner">
              <label
                htmlFor="discount"
                className="text-sm font-semibold text-slate-500"
              >
                Discount (optional)
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="discount"
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="20"
                  className="w-full rounded-2xl border border-transparent bg-slate-50 px-4 py-3 text-3xl font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                />
                <span className="text-2xl font-semibold text-slate-400">%</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Enter 20 for 20% discount
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-inner">
              <label
                htmlFor="vendorPrice"
                className="text-sm font-semibold text-slate-500"
              >
                Vendor Price (optional)
              </label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-semibold text-slate-400">$</span>
                <input
                  id="vendorPrice"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={vendorPrice}
                  onChange={(e) => setVendorPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-transparent bg-slate-50 px-4 py-3 text-3xl font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Compare with vendor&apos;s listed price
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Results
          </p>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Discount Amount
                </p>
                <p className="text-xs text-slate-400">
                  (Amount × (1 + Tax%)) × Discount%
                </p>
              </div>
              <p className="text-2xl font-semibold text-orange-600">
                {currencyFormatter.format(calculations.discountAmount)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Final Amount
                </p>
                <p className="text-xs text-slate-500">
                  After tax and discount
                </p>
              </div>
              <p className="text-3xl font-semibold text-emerald-600">
                {currencyFormatter.format(calculations.finalAmount)}
              </p>
            </div>

            {calculations.hasVendorPrice && (
              <>
                <div className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 ${
                  calculations.difference >= 0 
                    ? "border-blue-200 bg-blue-50" 
                    : "border-red-200 bg-red-50"
                }`}>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Savings vs Vendor
                    </p>
                    <p className="text-xs text-slate-500">
                      Vendor Price − Final Amount
                    </p>
                  </div>
                  <p className={`text-3xl font-semibold ${
                    calculations.difference >= 0 ? "text-blue-600" : "text-red-600"
                  }`}>
                    {calculations.difference >= 0 ? "+" : ""}{currencyFormatter.format(calculations.difference)}
                  </p>
                </div>

                <div className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 ${
                  calculations.commissionPercent >= 0 
                    ? "border-purple-200 bg-purple-50" 
                    : "border-teal-200 bg-teal-50"
                }`}>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {calculations.commissionPercent >= 0 ? "Vendor Commission" : "Below Market"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {calculations.commissionPercent >= 0 
                        ? "% markup vendor is charging" 
                        : "% cheaper than your price"}
                    </p>
                  </div>
                  <p className={`text-3xl font-semibold ${
                    calculations.commissionPercent >= 0 ? "text-purple-600" : "text-teal-600"
                  }`}>
                    {calculations.commissionPercent >= 0 ? "+" : ""}{calculations.commissionPercent.toFixed(1)}%
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
