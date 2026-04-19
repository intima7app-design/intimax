import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, "At least 6 characters"),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/feed" });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="glow-gold absolute inset-0 -z-10" />
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/60 p-8 shadow-elegant backdrop-blur-xl">
        <Link to="/" className="block text-center font-serif text-3xl text-gradient-gold">INTIMA</Link>
        <p className="mt-2 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">Welcome back</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-gold" />
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-gold" />
          </Field>
          <button disabled={loading} className="w-full rounded-full bg-gradient-gold py-3 font-medium text-primary-foreground shadow-gold disabled:opacity-50">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to INTIMA?{" "}
          <Link to="/signup" className="text-gold hover:underline">Create an account</Link>
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
