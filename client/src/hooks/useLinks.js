import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useLinks() {
  return useQuery({
    queryKey: ["links"],
    queryFn: async () => {
      const { data } = await api.get("/links");
      return data.items;
    }
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/links", payload);
      return data.item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["links"] })
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/links/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["links"] })
  });
}

export function useToggleLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/links/${id}/toggle`);
      return data.item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["links"] })
  });
}

export function useUpdateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/links/${id}`, payload);
      return data.item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["links"] })
  });
}

export function useReorderLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => {
      await api.put("/links/reorder", { ids });
      return ids;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["links"] })
  });
}

export function useUploadLinkThumbnail() {
  return useMutation({
    mutationFn: async (imageUrl) => {
      const { data } = await api.post("/links/thumbnail", { imageUrl });
      return data.imageUrl;
    }
  });
}
