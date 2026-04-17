import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      
      setAuth: ({ user, accessToken }) => {
        set({ user, accessToken });
        if (accessToken) {
          localStorage.setItem("accessToken", accessToken);
        }
      },
      
      logout: async () => {
        // Call backend logout API
        try {
          await api.post("/auth/logout");
        } catch (error) {
          console.error("Logout error:", error);
        }
        
        // Clear state
        set({ user: null, accessToken: null, isLoading: false });
        
        // Clear storage
        localStorage.removeItem("accessToken");
        localStorage.removeItem("auth-storage");
        
        // Clear any other stored data
        sessionStorage.clear();
      },
    }),
    {
      name: "auth-storage",
      getStorage: () => localStorage,
    }
  )
);