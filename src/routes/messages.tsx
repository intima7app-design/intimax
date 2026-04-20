import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/lib/auth-context";
import { fetchConversations } from "@/lib/queries";
import { formatDistanceToNow } from "@/lib/format";

export const Route = createFileRoute("/messages")({
  component: MessagesRoute,
});

function MessagesRoute() {
  const location = useLocation();
  const isConversationRoute = /^\/messages\/[^/]+$/.test(location.pathname);

  if (isConversationRoute) {
    return <Outlet />;
  }

  return (
    <RequireAuth>
      <AppShell>
        <Messages />
      </AppShell>
    </RequireAuth>
  );
}

function Messages() {
  const { user } = useAuth();
  const { data: convos = [] } = useQuery({ queryKey: ["convos", user!.id], queryFn: () => fetchConversations(user!.id) });

  return (
    <div className="space-y-2 p-4">
      <h1 className="px-1 pb-2 font-serif text-2xl text-gradient-gold">Messages</h1>
      {convos.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No conversations yet. Visit a profile and tap Message to begin.
        </p>
      )}
      {convos.map(({ other, lastMessage }: any) => (
        <Link
          key={other.id}
          to="/messages/$userId"
          params={{ userId: other.id }}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-gold/40"
        >
          <Avatar size="md" username={other.username} displayName={other.display_name} avatarUrl={other.avatar_url} accountType="creator" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{other.display_name}</p>
            <p className="truncate text-sm text-muted-foreground">{lastMessage.content || "[media]"}</p>
          </div>
          <span className="text-xs text-muted-foreground">{formatDistanceToNow(lastMessage.created_at)}</span>
        </Link>
      ))}
    </div>
  );
}
