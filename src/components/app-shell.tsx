import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Compass, MessageCircle, User, Plus, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchMyProfile, fetchTokenBalance } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchMyProfile(user!.id),
    enabled: !!user,
  });

  const { data: balance = 0 } = useQuery({
    queryKey: ["tokens", user?.id],
    queryFn: () => fetchTokenBalance(user!.id),
    enabled: !!user,
  });

  const isCreator = profile?.account_type === "creator";

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link to="/feed" className="font-serif text-2xl tracking-wide text-gradient-gold">
            INTIMA
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Tokens</span>
              <span className="font-semibold tabular-nums text-gradient-gold">
                {balance.toFixed(0)}
              </span>
            </div>
            <Link to="/notifications" className="rounded-full border border-border bg-card p-2 text-muted-foreground hover:text-gold transition">
              <Bell className="h-4 w-4" />
            </Link>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl">{children}</main>

      {/* Bottom nav */}
      <BottomNav isCreator={isCreator} username={profile?.username} />
    </div>
  );
}

function BottomNav({ isCreator, username }: { isCreator: boolean; username?: string }) {
  const location = useLocation();
  const items = [
    { to: "/feed", icon: Home, label: "Feed" },
    { to: "/explore", icon: Compass, label: "Explore" },
    ...(isCreator ? [{ to: "/create", icon: Plus, label: "Post", center: true }] : []),
    { to: "/messages", icon: MessageCircle, label: "Messages" },
    { to: username ? `/u/${username}` : "/feed", icon: User, label: "Profile" },
  ] as const;

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-border bg-card/90 px-3 py-2 shadow-elegant backdrop-blur-xl">
        {items.map((it) => {
          const active = location.pathname === it.to || (it.to !== "/feed" && location.pathname.startsWith(it.to));
          if ((it as any).center) {
            return (
              <Link
                key={it.label}
                to={it.to}
                className="mx-1 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold"
                aria-label={it.label}
              >
                <it.icon className="h-5 w-5" />
              </Link>
            );
          }
          return (
            <Link
              key={it.label}
              to={it.to}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition",
                active ? "text-gold" : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={it.label}
            >
              <it.icon className="h-5 w-5" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
