import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/lib/auth-context";
import { fetchNotifications } from "@/lib/queries";
import { formatDistanceToNow } from "@/lib/format";

export const Route = createFileRoute("/notifications")({
  component: () => (<RequireAuth><AppShell><NotificationsPage /></AppShell></RequireAuth>),
});

function NotificationsPage() {
  const { user } = useAuth();
  const { data: items = [] } = useQuery({ queryKey: ["notifications", user!.id], queryFn: () => fetchNotifications(user!.id) });

  return (
    <div className="space-y-2 p-4">
      <h1 className="px-1 pb-2 font-serif text-2xl text-gradient-gold">Notifications</h1>
      {items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          You're all caught up.
        </p>
      )}
      {items.map((n: any) => (
        <div key={n.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          {n.actor ? (
            <Avatar size="md" username={n.actor.username} displayName={n.actor.display_name} avatarUrl={n.actor.avatar_url} accountType="creator" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground">
              <Bell className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">{n.actor?.display_name ?? "Someone"}</span>{" "}
              <span className="text-muted-foreground">{n.message}</span>
            </p>
            <p className="text-xs text-muted-foreground">{formatDistanceToNow(n.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
