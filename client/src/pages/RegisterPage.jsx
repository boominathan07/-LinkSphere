import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCheckCircle, FiLoader, FiXCircle } from "react-icons/fi";
import GlassCard from "../components/ui/GlassCard";
import NeonButton from "../components/ui/NeonButton";
import { checkUsernameAvailability, useRegister } from "../hooks/useAuth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers, underscore"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  plan: z.enum(["free", "pro", "business"]),
  terms: z.boolean().refine((value) => value, "Please accept terms")
});

function RegisterPage() {
  const register = useRegister();
  const navigate = useNavigate();
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: "" });
  
  const {
    register: bind,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", username: "", email: "", password: "", plan: "free", terms: false }
  });
  
  const watchedUsername = watch("username");
  const watchedPassword = watch("password");
  const watchedPlan = watch("plan");

  useEffect(() => {
    let active = true;
    if (!watchedUsername || watchedUsername.length < 3) {
      setUsernameStatus({ checking: false, available: null, message: "" });
      return () => { active = false; };
    }
    
    setUsernameStatus({ checking: true, available: null, message: "Checking..." });
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(watchedUsername);
        if (!active) return;
        setUsernameStatus({
          checking: false,
          available: result.available,
          message: result.available ? "Username available" : "Username already taken"
        });
      } catch (_error) {
        if (!active) return;
        setUsernameStatus({ checking: false, available: null, message: "Could not check username" });
      }
    }, 500);
    
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [watchedUsername]);

  const passwordStrength = useMemo(() => {
    const value = watchedPassword || "";
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^a-zA-Z0-9]/.test(value)) score += 1;
    return score;
  }, [watchedPassword]);

  const onSubmit = async (values) => {
    if (usernameStatus.available === false) {
      toast.error("Please choose a different username");
      return;
    }
    try {
      const payload = {
        name: values.name,
        username: values.username.toLowerCase(),
        email: values.email.toLowerCase(),
        password: values.password,
        plan: values.plan
      };
      const response = await register.mutateAsync(payload);
      
      if (response.accessToken) {
        localStorage.setItem("accessToken", response.accessToken);
        toast.success("Account created successfully!");
        navigate("/onboarding");
      }
      
    } catch (error) {
      toast.error(error?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-lg">
        <h1 className="font-display text-3xl">Create your LinkSphere account</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <input 
              className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan" 
              placeholder="Full Name" 
              {...bind("name")} 
            />
            {errors.name && <p className="text-xs text-accent-rose mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <input
              className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan"
              placeholder="Username"
              {...bind("username")}
            />
            <div className="mt-1 flex items-center gap-2 text-xs">
              {usernameStatus.checking && <FiLoader className="animate-spin" />}
              {usernameStatus.available === true && <FiCheckCircle className="text-accent-lime" />}
              {usernameStatus.available === false && <FiXCircle className="text-accent-rose" />}
              <span className={usernameStatus.available === true ? "text-accent-lime" : usernameStatus.available === false ? "text-accent-rose" : "text-text-muted"}>
                {usernameStatus.message}
              </span>
            </div>
            {errors.username && <p className="text-xs text-accent-rose mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <input 
              className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan" 
              placeholder="Email" 
              {...bind("email")} 
            />
            {errors.email && <p className="text-xs text-accent-rose mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <input 
              className="w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-4 py-3 outline-none focus:border-accent-cyan" 
              placeholder="Password" 
              type="password" 
              {...bind("password")} 
            />
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all ${passwordStrength <= 1 ? "bg-accent-rose" : passwordStrength <= 3 ? "bg-accent-gold" : "bg-accent-lime"}`}
                style={{ width: `${(passwordStrength / 4) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-muted">Password strength: {passwordStrength}/4</p>
            {errors.password && <p className="text-xs text-accent-rose mt-1">{errors.password.message}</p>}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { id: "free", label: "Free", note: "3 links" },
              { id: "pro", label: "Pro", note: "7-day trial" },
              { id: "business", label: "Business", note: "Advanced suite" }
            ].map((plan) => (
              <label key={plan.id} className={`cursor-pointer rounded-xl border p-3 transition-all ${watchedPlan === plan.id ? "border-accent-cyan bg-accent-cyan/10" : "border-white/10"}`}>
                <input type="radio" className="sr-only" value={plan.id} {...bind("plan")} />
                <p className="font-medium">{plan.label}</p>
                <p className="text-xs text-text-muted">{plan.note}</p>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input type="checkbox" {...bind("terms")} className="cursor-pointer" />
            I agree to the terms and privacy policy
          </label>
          {errors.terms && <p className="text-xs text-accent-rose">{errors.terms.message}</p>}

          <NeonButton className="w-full" type="submit" disabled={register.isPending}>
            {register.isPending ? "Creating account..." : "Register"}
          </NeonButton>
        </form>
      </GlassCard>
    </div>
  );
}

export default RegisterPage;