import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import demo1 from "@/assets/demo-1.jpg";
import demo2 from "@/assets/demo-2.jpg";
import demo3 from "@/assets/demo-3.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/feed" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl text-gradient-gold">INTIMA</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/signup" className="rounded-full bg-gradient-gold px-5 py-2 text-sm font-medium text-primary-foreground shadow-gold">Join INTIMA</Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-24">
        <div className="glow-gold absolute inset-0 -z-10" />
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">A members-only gallery</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] text-foreground md:text-6xl">
              Where every <em className="text-gradient-gold">moment</em> is an artifact.
            </h1>
            <p className="mt-6 max-w-md text-muted-foreground">
              Discover premium creators. Subscribe, unlock, and collect intimate, exclusive content with INTIMA tokens.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link to="/signup" className="rounded-full bg-gradient-gold px-7 py-3 font-medium text-primary-foreground shadow-gold">
                Create your account
              </Link>
              <Link to="/login" className="rounded-full border border-border px-7 py-3 text-sm">
                Sign in
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              <img src={demo1} alt="Creator" className="aspect-[3/4] w-full rounded-2xl object-cover shadow-elegant" />
              <div className="space-y-3">
                <img src={demo2} alt="Creator" className="aspect-square w-full rounded-2xl object-cover shadow-elegant" />
                <img src={demo3} alt="Creator" className="aspect-square w-full rounded-2xl object-cover shadow-elegant" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
