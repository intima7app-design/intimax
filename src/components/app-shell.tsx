import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Compass, MessageCircle, User, Plus, Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  fetchMyProfile,
  fetchTokenBalance,
  fetchUnreadNotificationCount,
  fetchUnreadMessageCount,
  setMessagesLastSeen,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

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

  const { data: unreadNotifs = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: () => fetchUnreadNotificationCount(user!.id),
    enabled: !!user,
    refetchInterval: 15_000,
  });

  const { data: unreadMsgs = 0 } = useQuery({
    queryKey: ["unread-messages", user?.id],
    queryFn: () => fetchUnreadMessageCount(user!.id),
    enabled: !!user,
    refetchInterval: 10_000,
  });

  // Mark messages as seen when viewing any /messages route
  useEffect(() => {
    if (!user) return;
    if (location.pathname.startsWith("/messages")) {
      setMessagesLastSeen(user.id);
      qc.setQueryData(["unread-messages", user.id], 0);
      qc.invalidateQueries({ queryKey: ["unread-messages", user.id] });
    }
  }, [location.pathname, user, qc]);

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
            <Link
              to="/notifications"
              className="relative rounded-full border border-border bg-card p-2 text-muted-foreground hover:text-gold transition"
              aria-label={unreadNotifs > 0 ? `Notifications, ${unreadNotifs} unread` : "Notifications"}
            >
              <Bell className="h-4 w-4" />
              {unreadNotifs > 0 && <CountBadge count={unreadNotifs} />}
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
      <BottomNav isCreator={isCreator} username={profile?.username} unreadMsgs={unreadMsgs} />
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-2 ring-background">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function BottomNav({ isCreator, username, unreadMsgs }: { isCreator: boolean; username?: string; unreadMsgs: number }) {
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
          const showMsgBadge = it.label === "Messages" && unreadMsgs > 0;
          return (
            <Link
              key={it.label}
              to={it.to}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full transition",
                active ? "text-gold" : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={it.label}
            >
              <it.icon className="h-5 w-5" />
              {showMsgBadge && <CountBadge count={unreadMsgs} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
