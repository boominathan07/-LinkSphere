import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data } = await api.get("/admin/stats");
      return data;
    }
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get("/admin/users");
      return data;
    }
  });
}

export function useAdminUsersQuery(params) {
  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: async () => {
      const { data } = await api.get("/admin/users", { params });
      return data;
    }
  });
}

export function useAdminUserDetail(userId) {
  return useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users/${userId}`);
      return data;
    },
    enabled: Boolean(userId)
  });
}

export function useAdminAuditLog(params = {}) {
  return useQuery({
    queryKey: ["admin-audit", params],
    queryFn: async () => {
      const { data } = await api.get("/admin/audit-log", { params });
      return data.items;
    }
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const { data } = await api.get("/admin/analytics");
      return data;
    }
  });
}

export function useAdminList() {
  return useQuery({
    queryKey: ["admin-admins"],
    queryFn: async () => {
      const { data } = await api.get("/admin/admins");
      return data.items;
    }
  });
}

export function useAdminActionTypes() {
  return useQuery({
    queryKey: ["admin-action-types"],
    queryFn: async () => {
      const { data } = await api.get("/admin/action-types");
      return data.items;
    }
  });
}

export function useSetUserPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, plan }) => {
      const { data } = await api.put(`/admin/users/${userId}/plan`, { plan });
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
    }
  });
}

export function useToggleUserBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const { data } = await api.patch(`/admin/users/${userId}/block`);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
    }
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const { data } = await api.delete(`/admin/users/${userId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
    }
  });
}
