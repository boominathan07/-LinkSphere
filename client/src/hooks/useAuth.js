import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

export async function checkUsernameAvailability(username) {
  try {
    const response = await api.get(`/auth/check-username/${username}`);
    return { available: response.data.available };
  } catch (error) {
    console.error("Username check error:", error);
    return { available: false };
  }
}

export function useRegister() {
  const setAuth = useAuthStore((state) => state.setAuth);
  
  return useMutation({
    mutationFn: async (userData) => {
      const response = await api.post("/auth/register", userData);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        setAuth({ user: data.user, accessToken: data.accessToken });
      }
    },
  });
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);
  
  return useMutation({
    mutationFn: async (credentials) => {
      const response = await api.post("/auth/login", credentials);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        setAuth({ user: data.user, accessToken: data.accessToken });
      }
    },
  });
}

export function useGoogleAuth() {
  const setAuth = useAuthStore((state) => state.setAuth);
  
  return useMutation({
    mutationFn: async ({ email, name }) => {
      const response = await api.post("/auth/google", { email, name });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        setAuth({ user: data.user, accessToken: data.accessToken });
      }
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email) => {
      const response = await api.post("/auth/forgot-password", { email });
      return response.data;
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async (email) => {
      const response = await api.post("/auth/resend-verification", { email });
      return response.data;
    },
  });
}