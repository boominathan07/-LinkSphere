import { useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import GlassCard from "../components/ui/GlassCard";
import NeonButton from "../components/ui/NeonButton";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";
import {
  useBillingPortal,
  useBillingStatus,
  useCancelSubscription,
  useCheckout,
  useInvoices
} from "../hooks/useBilling";

function UsageBar({ label, used, limit }) {
  const percentage = limit ? Math.min(Math.round((used / Math.max(limit, 1)) * 100), 100) : 100;
  return (
    <div className="rounded-xl border border-white/10 bg-bg-elevated/50 p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <p>{label}</p>
        <p className="text-text-muted">
          {used}
          {limit ? ` / ${limit}` : ""}
        </p>
      </div>
      <div className="h-2 rounded-full bg-black/40">
        <div className="h-2 rounded-full bg-accent-cyan" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function BillingPage() {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { data: status } = useBillingStatus();
  const { data: invoices = [] } = useInvoices();
  const checkout = useCheckout();
  const cancel = useCancelSubscription();
  const portal = useBillingPortal();

  const onUpgrade = async (plan) => {
    try {
      const data = await checkout.mutateAsync(plan);
      toast.success(`Checkout created for ${plan} plan`);
      window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create checkout");
    }
  };

  const onCancel = async () => {
    try {
      await cancel.mutateAsync();
      toast.success("Subscription cancelled successfully");
      setShowCancelModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to cancel subscription");
    }
  };

  const onDownloadInvoicePdf = async (invoiceId) => {
    try {
      const res = await api.get(`/payment/invoices/${invoiceId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not download PDF");
    }
  };

  const onOpenPortal = async () => {
    try {
      const data = await portal.mutateAsync();
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success("Opening payment portal");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to open payment portal");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Billing & Subscription
        </h1>
        <p className="text-text-muted mt-1">Manage your plan, payments, and subscription</p>
      </div>

      {/* Current Plan Card */}
      <GlassCard className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-text-muted">Current plan:</p>
            <span className={`rounded-full px-3 py-1 text-sm uppercase font-semibold ${
              status?.plan === "pro" ? "bg-accent-cyan/25 text-accent-cyan" :
              status?.plan === "business" ? "bg-accent-gold/25 text-accent-gold" :
              "bg-gray-500/25 text-gray-300"
            }`}>
              {status?.plan || user?.plan || "free"}
            </span>
          </div>
          <p className="text-sm text-text-muted">
            Next renewal:{" "}
            {status?.nextRenewalDate
              ? format(new Date(status.nextRenewalDate), "MMMM d, yyyy")
              : "No active subscription"}
          </p>
        </div>

        {/* Usage Bars */}
        <div className="grid gap-3 md:grid-cols-2">
          <UsageBar
            label="Links used"
            used={status?.usage?.linksUsed || 0}
            limit={status?.usage?.linksLimit}
          />
          <UsageBar 
            label="Email captures" 
            used={status?.usage?.emailCaptures || 0} 
            limit={status?.plan === "free" ? 50 : status?.plan === "pro" ? 500 : null}
          />
        </div>

        {/* Action Buttons */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(status?.plan !== "pro") && (
            <NeonButton onClick={() => onUpgrade("pro")}>
              Upgrade to Pro (₹299/mo)
            </NeonButton>
          )}
          {(status?.plan !== "business") && (
            <NeonButton onClick={() => onUpgrade("business")}>
              Upgrade to Business (₹799/mo)
            </NeonButton>
          )}
          <button
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-all"
            onClick={onOpenPortal}
            type="button"
          >
            💳 Manage Payment Method
          </button>
          {(status?.plan !== "free") && (
            <button
              className="rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/10 transition-all"
              onClick={() => setShowCancelModal(true)}
              type="button"
            >
              Cancel Subscription
            </button>
          )}
        </div>

        {/* Plan Features Info */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-text-muted">
            💡 <span className="text-accent-cyan">Pro plan:</span> Unlimited links, custom domain, QR codes, CSV export, email capture
          </p>
          <p className="text-xs text-text-muted mt-1">
            💡 <span className="text-accent-gold">Business plan:</span> Everything in Pro + White label, team members, API access, priority support
          </p>
        </div>
      </GlassCard>

      {/* Invoice History */}
      <GlassCard className="p-6">
        <h2 className="mb-4 font-display text-2xl">Invoice History</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-text-muted border-b border-white/10">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {!invoices.length ? (
                <tr>
                  <td className="px-3 py-8 text-center text-text-muted" colSpan={4}>
                    📄 No invoices yet — they appear here after your first successful payment.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-white/5 hover:bg-white/5 transition-all">
                    <td className="px-3 py-3">{format(new Date(invoice.createdAt), "MMMM d, yyyy")}</td>
                    <td className="px-3 py-3 font-medium">
                      {(invoice.currency || "INR").toUpperCase()} {invoice.amount}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        invoice.status === "paid" ? "bg-emerald-500/20 text-emerald-400" :
                        invoice.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {invoice.status || "n/a"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="text-accent-cyan hover:underline flex items-center gap-1"
                        onClick={() => onDownloadInvoicePdf(invoice.id)}
                      >
                        📄 Download PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md space-y-5 p-6">
            <h3 className="font-display text-2xl">Cancel Subscription?</h3>
            <p className="text-sm text-text-muted">
              Your subscription will be canceled immediately. You will lose access to Pro/Business features and your account will be downgraded to Free plan.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <p className="text-xs text-amber-300">
                ⚠️ This action cannot be undone. You can always upgrade again later.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium hover:bg-white/5 transition-all"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Plan
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 text-sm font-medium text-white hover:shadow-lg hover:shadow-red-500/30 transition-all"
                onClick={onCancel}
              >
                Confirm Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default BillingPage;