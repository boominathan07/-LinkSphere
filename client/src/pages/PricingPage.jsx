import { useMemo, useState } from "react";
import { FiCheck } from "react-icons/fi";
import { Link } from "react-router-dom";
import GlassCard from "../components/ui/GlassCard";
import NeonButton from "../components/ui/NeonButton";
import { useAuthStore } from "../store/authStore";

const planDefinitions = [
  {
    name: "Free",
    monthly: 0,
    annualMonthlyEquivalent: 0,
    cta: "Start Free",
    description: "Best for creators getting started.",
    featured: false,
    features: [
      "3 active links",
      "Basic click analytics",
      "Link scheduling",
      "Community support"
    ]
  },
  {
    name: "Pro",
    monthly: 299,
    annualMonthlyEquivalent: 239,
    cta: "Start Pro",
    description: "For creators who want growth analytics.",
    featured: true,
    features: [
      "Unlimited links",
      "Full analytics suite",
      "CSV export",
      "Email capture",
      "QR code sharing",
      "Custom domain support",
      "Priority email support"
    ]
  },
  {
    name: "Business",
    monthly: 799,
    annualMonthlyEquivalent: 639,
    cta: "Start Business",
    description: "For teams and agencies with white-label needs.",
    featured: false,
    features: [
      "Everything in Pro",
      "White-label footer removal",
      "Priority support (24/7)",
      "Team seat management",
      "API access",
      "Custom branding",
      "SLA guarantee"
    ]
  }
];

const comparisonRows = [
  { feature: "Active links", free: "3", pro: "Unlimited", business: "Unlimited" },
  { feature: "Geo + device analytics", free: "❌", pro: "✅", business: "✅" },
  { feature: "Audience peak-hours heatmap", free: "❌", pro: "✅", business: "✅" },
  { feature: "Email capture widget", free: "❌", pro: "✅", business: "✅" },
  { feature: "QR profile sharing", free: "❌", pro: "✅", business: "✅" },
  { feature: "CSV export", free: "❌", pro: "✅", business: "✅" },
  { feature: "Custom domain", free: "❌", pro: "✅", business: "✅" },
  { feature: "White-label profile", free: "❌", pro: "❌", business: "✅" },
  { feature: "Team seats", free: "❌", pro: "❌", business: "✅ (Up to 10)" },
  { feature: "API access", free: "❌", pro: "❌", business: "✅" },
  { feature: "Priority support", free: "❌", pro: "Email", business: "24/7" }
];

function renderValue(value) {
  if (value === "✅") {
    return <span className="text-accent-lime text-lg">✓</span>;
  }
  if (value === "❌") {
    return <span className="text-text-muted">—</span>;
  }
  return <span className="text-text-primary">{value}</span>;
}

function PricingPage() {
  const { user } = useAuthStore();
  const [billing, setBilling] = useState("monthly");
  const isAnnual = billing === "annual";

  const plans = useMemo(() => {
    return planDefinitions.map((plan) => {
      const amount = isAnnual ? plan.annualMonthlyEquivalent : plan.monthly;
      const originalAmount = plan.monthly;
      const savings = originalAmount > 0 ? ((originalAmount - amount) / originalAmount * 100).toFixed(0) : 0;
      
      return {
        ...plan,
        amount,
        originalAmount,
        savings,
        label: amount === 0 ? "Free forever" : `₹${amount}/mo`,
        subLabel: isAnnual && amount > 0 ? `Billed annually (${savings}% off)` : "Billed monthly"
      };
    });
  }, [isAnnual]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:py-10">
      {/* Header */}
      <div className="space-y-4 text-center">
        <h1 className="font-display text-3xl md:text-5xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Simple, Transparent Pricing
        </h1>
        <p className="mx-auto max-w-2xl text-text-muted">
          Choose a plan that fits your growth stage. Upgrade, downgrade, or cancel anytime.
        </p>
        
        {/* Billing Toggle */}
        <div className="mx-auto inline-flex rounded-xl border border-white/15 bg-bg-elevated/50 p-1">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm transition-all ${
              !isAnnual ? "bg-gradient-to-r from-accent-violet to-accent-cyan text-white shadow-lg" : "text-text-muted hover:text-white"
            }`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm transition-all ${
              isAnnual ? "bg-gradient-to-r from-accent-violet to-accent-cyan text-white shadow-lg" : "text-text-muted hover:text-white"
            }`}
            onClick={() => setBilling("annual")}
          >
            Annual <span className="ml-1 text-xs text-accent-lime">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid items-stretch gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <GlassCard 
            key={plan.name} 
            className={`flex h-full flex-col relative overflow-hidden ${
              plan.featured ? "ring-2 ring-accent-cyan/50 shadow-lg shadow-accent-cyan/10" : ""
            }`}
          >
            {plan.featured && (
              <div className="absolute top-0 right-0">
                <div className="bg-gradient-to-r from-accent-cyan to-accent-violet text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                  POPULAR
                </div>
              </div>
            )}
            
            <div>
              <h2 className="font-display text-2xl">{plan.name}</h2>
              <p className="mt-2 text-text-muted text-sm">{plan.description}</p>
            </div>
            
            <div className="mt-4">
              {plan.amount === 0 ? (
                <p className="font-display text-4xl">Free</p>
              ) : (
                <>
                  <p className="font-display text-4xl">
                    ₹{plan.amount}
                    <span className="text-lg text-text-muted">/mo</span>
                  </p>
                  {isAnnual && plan.originalAmount > 0 && (
                    <p className="text-sm text-accent-lime mt-1">
                      Save {plan.savings}% (₹{plan.originalAmount}/mo normally)
                    </p>
                  )}
                </>
              )}
              <p className="mt-1 text-xs text-text-muted">{plan.subLabel}</p>
            </div>

            <ul className="mt-5 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <FiCheck className="text-accent-cyan w-4 h-4 flex-shrink-0" />
                  <span className="text-text-primary">{feature}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-auto pt-6">
              {user ? (
                <Link to="/dashboard/billing" className="block">
                  <NeonButton className="w-full">
                    {plan.amount === 0 ? "Current Plan" : "Upgrade Now"}
                  </NeonButton>
                </Link>
              ) : (
                <Link to="/register" className="block">
                  <NeonButton className="w-full">{plan.cta}</NeonButton>
                </Link>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <GlassCard className="p-6">
        <h2 className="mb-4 font-display text-2xl">Full Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-text-muted border-b border-white/10">
              <tr>
                <th className="px-3 py-3">Feature</th>
                <th className="px-3 py-3">Free</th>
                <th className="px-3 py-3">Pro</th>
                <th className="px-3 py-3">Business</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-t border-white/5 hover:bg-white/5 transition-all">
                  <td className="px-3 py-3 font-medium">{row.feature}</td>
                  <td className="px-3 py-3">{renderValue(row.free)}</td>
                  <td className="px-3 py-3">{renderValue(row.pro)}</td>
                  <td className="px-3 py-3">{renderValue(row.business)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* FAQ Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard className="p-5">
          <h3 className="font-display text-xl">💰 Billing</h3>
          <p className="mt-2 text-sm text-text-muted">
            Annual plans are billed upfront with 20% savings. Monthly plans renew every 30 days. You can switch between plans anytime.
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="font-display text-xl">🔄 Cancellation</h3>
          <p className="mt-2 text-sm text-text-muted">
            Cancel anytime from billing settings. Your plan remains active through the paid period. No hidden fees or contracts.
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="font-display text-xl">👥 Team seats</h3>
          <p className="mt-2 text-sm text-text-muted">
            Business includes team seat management for up to 10 collaborators. Additional seats available for ₹199/mo each.
          </p>
        </GlassCard>
      </div>

      {/* CTA Footer */}
      <GlassCard className="text-center p-8 bg-gradient-to-r from-accent-violet/10 to-accent-cyan/10">
        <h2 className="font-display text-3xl">Start Free Today</h2>
        <p className="mt-2 text-text-muted max-w-md mx-auto">
          No credit card required. Build your profile, publish links, and upgrade when you're ready.
        </p>
        <div className="mt-5">
          {user ? (
            <Link to="/dashboard/billing">
              <NeonButton>Go to Billing</NeonButton>
            </Link>
          ) : (
            <Link to="/register">
              <NeonButton>Start Free</NeonButton>
            </Link>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export default PricingPage;