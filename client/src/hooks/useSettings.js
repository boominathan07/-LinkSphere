import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useProfileSettings() {
  return useQuery({
    queryKey: ["settings-profile"],
    queryFn: async () => {
      const { data } = await api.get("/settings/profile");
      return data.user;
    }
  });
}

export function useUpdateProfileSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      // Use correct endpoint
      const { data } = await api.put("/settings/profile", payload);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
    },
    onError: (error) => {
      console.error("Update profile error:", error);
      throw error;
    }
  });
}

export function useSubscribers() {
  return useQuery({
    queryKey: ["subscribers"],
    queryFn: async () => {
      const { data } = await api.get("/settings/subscribers");
      return data.items;
    }
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put("/settings/password", payload);
      return data;
    }
  });
}

export function use2FASetup() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/auth/2fa/setup");
      return data;
    }
  });
}

export function use2FAVerify() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code) => {
      const { data } = await api.post("/auth/2fa/verify", { code });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-profile"] })
  });
}

export function use2FADisable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/auth/2fa/disable");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-profile"] })
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["settings-sessions"],
    queryFn: async () => {
      const { data } = await api.get("/settings/sessions");
      return data.items;
    }
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId) => {
      const { data } = await api.delete(`/settings/sessions/${sessionId}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-sessions"] })
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["settings-notifications"],
    queryFn: async () => {
      const { data } = await api.get("/settings/notifications");
      return data.preferences;
    }
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put("/settings/notifications", payload);
      return data.preferences;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-notifications"] })
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (username) => {
      const { data } = await api.delete("/settings/account", { data: { username } });
      return data;
    }
  });
}