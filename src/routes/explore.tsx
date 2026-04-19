import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { fetchCreators } from "@/lib/queries";

export const Route = createFileRoute("/explore")({
  component: () => (<RequireAuth><AppShell><Explore /></AppShell></RequireAuth>),
});

function Explore() {
  const { data: creators = [] } = useQuery({ queryKey: ["creators"], queryFn: fetchCreators });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return creators;
    return creators.filter((c: any) =>
      c.username?.toLowerCase().includes(s) || c.display_name?.toLowerCase().includes(s),
    );
  }, [creators, q]);

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search creators by name or @handle"
          className="w-full rounded-full border border-input bg-card px-12 py-3 outline-none focus:border-gold"
        />
      </div>

      <h2 className="font-serif text-2xl text-gradient-gold">Discover Creators</h2>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No creators yet. Sign up a creator account to populate the gallery.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((c: any) => (
            <Link
              key={c.id}
              to="/u/$username"
              params={{ username: c.username }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-gold/40 hover:shadow-gold"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-onyx">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.display_name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-4xl text-muted-foreground">
                    {c.display_name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate font-medium text-foreground">{c.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{c.username}</p>
                {c.creator_profiles?.[0]?.subscription_price && (
                  <p className="mt-1 text-[11px] text-gold">{Number(c.creator_profiles[0].subscription_price)} TKN/mo</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
