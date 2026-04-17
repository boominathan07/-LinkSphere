import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useBillingStatus() {
  return useQuery({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const { data } = await api.get("/payment/status");
      return data;
    }
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data } = await api.get("/payment/invoices");
      return data.items;
    }
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (plan) => {
      const proId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
      const bizId = import.meta.env.VITE_STRIPE_BUSINESS_PRICE_ID;
      const priceId = plan === "business" ? bizId : proId;
      const { data } = await api.post("/payment/checkout", {
        plan,
        ...(priceId ? { priceId } : {})
      });
      return data;
    }
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/payment/cancel");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-status"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/payment/portal");
      return data;
    }
  });
}
