import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import GlassCard from "../components/ui/GlassCard";
import NeonButton from "../components/ui/NeonButton";
import { useForgotPassword, useGoogleAuth, useLogin } from "../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [shake, setShake] = useState(false);
  const loginMutation = useLogin();
  const googleMutation = useGoogleAuth();
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = async (values) => {
    try {
      await loginMutation.mutateAsync(values);
      toast.success("Login successful");
      navigate("/dashboard");
    } catch (error) {
      setShake(true);
      setTimeout(() => setShake(false), 350);
      if (!error?.response) {
        toast.error("Cannot reach API server. Start backend and database first.");
        return;
      }
      const payload = error?.response?.data;
      const message =
        (typeof payload === "string" && payload) ||
        payload?.message ||
        `Authentication failed (${error?.response?.status || "unknown"})`;
      toast.error(message);
    }
  };

  const onGoogleLogin = async () => {
    const email = window.prompt("Enter your Google email");
    if (!email) return;
    const name = window.prompt("Enter your display name") || email.split("@")[0];
    try {
      await googleMutation.mutateAsync({ email, name });
      toast.success("Google login successful");
      navigate("/dashboard");
    } catch (error) {
      const payload = error?.response?.data;
      toast.error(payload?.message || "Google login failed");
    }
  };

  const onForgotPassword = async () => {
    const email = watch("email");
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    try {
      await forgotPassword.mutateAsync(email);
      toast.success("Reset instructions sent (or token issued in dev)");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not process reset request");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <GlassCard className="w-full max-w-md space-y-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Welcome back</h1>
          <p className="mt-2 text-sm text-text-muted">Sign in to manage links, analytics, audience, and billing.</p>
        </div>
        <button
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
          onClick={onGoogleLogin}
          type="button"
        >
          {googleMutation.isPending ? "Connecting Google..." : "Continue with Google"}
        </button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-bg-base px-3 text-text-muted">or with email</span>
          </div>
        </div>
        <motion.form
          className="space-y-5"
          onSubmit={handleSubmit(onSubmit)}
          animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <label className="block">
            <span className="text-sm text-text-muted">Email</span>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-bg-elevated/40 px-4 py-3 outline-none focus:border-accent-violet"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email ? <p className="mt-1 text-xs text-accent-rose">{errors.email.message}</p> : null}
          </label>
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Password</span>
              <button className="text-xs text-accent-cyan" onClick={() => setShowPassword((prev) => !prev)} type="button">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-bg-elevated/40 px-4 py-3 outline-none focus:border-accent-violet"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              {...register("password")}
            />
            {errors.password ? <p className="mt-1 text-xs text-accent-rose">{errors.password.message}</p> : null}
          </label>
          <div className="text-right">
            <button className="text-xs text-accent-cyan" type="button" onClick={() => setShowForgot((prev) => !prev)}>
              Forgot password?
            </button>
          </div>
          {showForgot ? (
            <div className="rounded-xl border border-white/10 bg-bg-elevated/30 p-3 text-xs text-text-muted">
              <p>We will send reset instructions to your email.</p>
              <button className="mt-2 text-accent-cyan" type="button" onClick={onForgotPassword}>
                {forgotPassword.isPending ? "Sending..." : "Send reset instructions"}
              </button>
            </div>
          ) : null}
          <NeonButton className="w-full" type="submit">
            {loginMutation.isPending ? "Signing in..." : "Sign in"}
          </NeonButton>
        </motion.form>
        <p className="text-center text-sm text-text-muted">
          New to LinkSphere?{" "}
          <Link className="text-accent-cyan" to="/register">
            Create account
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}

export default LoginPage;
