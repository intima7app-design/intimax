import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Crown, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, "At least 6 characters"),
  username: z.string().trim().min(3).max(24).regex(/^[a-z0-9_]+$/i, "letters, numbers, underscore"),
  display_name: z.string().trim().min(1).max(50),
  account_type: z.enum(["creator", "fan"]),
  subscription_price: z.number().min(0).max(999).optional(),
});

function SignupPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<"fan" | "creator">("fan");
  const [form, setForm] = useState({ email: "", password: "", username: "", display_name: "", subscription_price: 9.99 });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...form, account_type: accountType });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/feed`,
        data: {
          username: parsed.data.username,
          display_name: parsed.data.display_name,
          account_type: parsed.data.account_type,
          subscription_price: parsed.data.subscription_price ?? 9.99,
        },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("already")) toast.error("That email is already registered");
      else toast.error(error.message);
      return;
    }
    toast.success("Welcome to INTIMA");
    navigate({ to: "/feed" });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <div className="glow-gold absolute inset-0 -z-10" />
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/60 p-8 shadow-elegant backdrop-blur-xl">
        <Link to="/" className="block text-center font-serif text-3xl text-gradient-gold">INTIMA</Link>
        <p className="mt-2 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">Create your account</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <TypeCard active={accountType === "fan"} onClick={() => setAccountType("fan")} icon={<User className="h-5 w-5" />} title="Fan" subtitle="Discover & subscribe" />
          <TypeCard active={accountType === "creator"} onClick={() => setAccountType("creator")} icon={<Crown className="h-5 w-5" />} title="Creator" subtitle="Share & earn" />
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username">
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:border-gold" />
            </Field>
            <Field label="Display name">
              <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:border-gold" />
            </Field>
          </div>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:border-gold" />
          </Field>
          <Field label="Password">
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:border-gold" />
          </Field>
          {accountType === "creator" && (
            <Field label="Monthly subscription price (TKN)">
              <input type="number" min={0} step={0.5} value={form.subscription_price}
                onChange={(e) => setForm({ ...form, subscription_price: Number(e.target.value) })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:border-gold" />
            </Field>
          )}

          <button disabled={loading} className="w-full rounded-full bg-gradient-gold py-3 font-medium text-primary-foreground shadow-gold disabled:opacity-50">
            {loading ? "Creating..." : `Join as ${accountType}`}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already a member?{" "}
          <Link to="/login" className="text-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function TypeCard({ active, onClick, icon, title, subtitle }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition",
        active ? "border-gold bg-gradient-to-br from-gold/15 to-transparent" : "border-border bg-background/50 hover:border-muted-foreground/30",
      )}>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", active ? "bg-gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground")}>
        {icon}
      </div>
      <span className="mt-2 font-serif text-lg">{title}</span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </button>
  );
}
