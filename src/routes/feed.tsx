import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { LockedMedia } from "@/components/locked-media";
import {
  fetchFeed, fetchStories, fetchMyUnlocks, fetchMySubscriptions, fetchMyProfile,
} from "@/lib/queries";
import { formatDistanceToNow } from "@/lib/format";

export const Route = createFileRoute("/feed")({
  component: () => (<RequireAuth><AppShell><FeedPage /></AppShell></RequireAuth>),
});

function FeedPage() {
  const { user } = useAuth();

  const { data: profile } = useQuery({ queryKey: ["profile", user!.id], queryFn: () => fetchMyProfile(user!.id) });
  const { data: posts = [], isLoading } = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });
  const { data: stories = [] } = useQuery({ queryKey: ["stories"], queryFn: fetchStories });
  const { data: unlocks = new Set<string>() } = useQuery({ queryKey: ["unlocks", user!.id], queryFn: () => fetchMyUnlocks(user!.id) });
  const { data: subs = new Set<string>() } = useQuery({ queryKey: ["subscriptions", user!.id], queryFn: () => fetchMySubscriptions(user!.id) });

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Stories */}
      <section className="-mx-4 px-4">
        <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
          {stories.length === 0 && (
            <div className="text-xs text-muted-foreground">No stories yet — follow creators to see theirs here.</div>
          )}
          {stories.map((s: any) => (
            <Link to="/u/$username" params={{ username: s.profiles?.username ?? "" }} key={s.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <Avatar size="lg" ring username={s.profiles?.username} displayName={s.profiles?.display_name} avatarUrl={s.profiles?.avatar_url} accountType="creator" />
              <span className="truncate text-[11px] text-muted-foreground">{s.profiles?.display_name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Posts */}
      <section className="space-y-6">
        {isLoading && <p className="text-center text-muted-foreground">Loading...</p>}
        {!isLoading && posts.length === 0 && <EmptyFeed />}
        {posts.map((p: any) => {
          const isOwner = p.creator_id === user!.id;
          const isSubscribed = subs.has(p.creator_id);
          const isUnlocked = unlocks.has(`post:${p.id}`);
          return (
            <article key={p.id} className="rounded-3xl border border-border bg-card p-5 shadow-elegant">
              <header className="mb-4 flex items-center gap-3">
                <Avatar size="md" username={p.profiles?.username} displayName={p.profiles?.display_name} avatarUrl={p.profiles?.avatar_url} accountType={p.profiles?.account_type} linkTo />
                <div className="flex-1 min-w-0">
                  <Link to="/u/$username" params={{ username: p.profiles?.username ?? "" }} className="block truncate font-medium text-foreground hover:text-gold">
                    {p.profiles?.display_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">@{p.profiles?.username} · {formatDistanceToNow(p.created_at)}</p>
                </div>
                {p.visibility !== "free" && (
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-gold">
                    {p.visibility === "ppv" ? "PPV" : "Members"}
                  </span>
                )}
              </header>

              {p.media_url || p.visibility !== "free" ? (
                <LockedMedia
                  contentType="post"
                  contentId={p.id}
                  visibility={p.visibility}
                  price={Number(p.price)}
                  creatorId={p.creator_id}
                  creatorPrice={9.99}
                  isUnlocked={isUnlocked}
                  isSubscribed={isSubscribed}
                  isOwner={isOwner}
                  mediaUrl={p.media_url}
                  mediaType={p.media_type}
                  aspectRatio={(p.aspect_ratio ?? "4:5").replace(":", " / ")}
                  mediaPosition={p.media_position}
                />
              ) : null}

              {p.caption && <p className="mt-4 leading-relaxed text-foreground/90">{p.caption}</p>}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="rounded-3xl border border-dashed border-border p-10 text-center">
      <h3 className="font-serif text-2xl text-gradient-gold">Your gallery awaits</h3>
      <p className="mt-2 text-sm text-muted-foreground">No posts yet. Visit Explore to discover creators or, if you're a creator, share your first post.</p>
      <div className="mt-5 flex justify-center gap-3">
        <Link to="/explore" className="rounded-full bg-gradient-gold px-5 py-2 text-sm font-medium text-primary-foreground">Explore</Link>
      </div>
    </div>
  );
}
