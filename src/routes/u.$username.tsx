import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Crown, MessageCircle, UserPlus, UserMinus } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { LockedMedia } from "@/components/locked-media";
import { useAuth } from "@/lib/auth-context";
import {
  fetchProfileByUsername, fetchPostsByCreator, fetchMyUnlocks, fetchMySubscriptions,
  fetchFollowingCreatorIds, toggleFollow, subscribeToCreator,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/u/$username")({
  component: () => (<RequireAuth><AppShell><ProfilePage /></AppShell></RequireAuth>),
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: () => fetchProfileByUsername(username),
  });

  const isCreator = profile?.account_type === "creator";
  const creatorProfile = Array.isArray(profile?.creator_profiles)
    ? profile?.creator_profiles?.[0]
    : (profile?.creator_profiles as any);
  const creatorPrice = Number(creatorProfile?.subscription_price ?? 9.99);

  const { data: posts = [] } = useQuery({
    queryKey: ["posts-by-creator", profile?.id],
    queryFn: () => fetchPostsByCreator(profile!.id),
    enabled: !!profile && isCreator,
  });

  const { data: following = new Set<string>() } = useQuery({
    queryKey: ["following", user!.id], queryFn: () => fetchFollowingCreatorIds(user!.id),
  });
  const { data: subs = new Set<string>() } = useQuery({
    queryKey: ["subscriptions", user!.id], queryFn: () => fetchMySubscriptions(user!.id),
  });
  const { data: unlocks = new Set<string>() } = useQuery({
    queryKey: ["unlocks", user!.id], queryFn: () => fetchMyUnlocks(user!.id),
  });

  const { data: counts } = useQuery({
    queryKey: ["counts", profile?.id],
    queryFn: async () => {
      if (!profile) return { followers: 0, subscribers: 0 };
      const [{ count: followers }, { count: subscribers }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("creator_id", profile.id).eq("status", "active"),
      ]);
      return { followers: followers ?? 0, subscribers: subscribers ?? 0 };
    },
    enabled: !!profile,
  });

  if (isLoading) return <p className="p-6 text-center text-muted-foreground">Loading...</p>;
  if (!profile) return <p className="p-6 text-center">Profile not found</p>;

  const isMe = profile.id === user!.id;
  const isFollowing = following.has(profile.id);
  const isSubscribed = subs.has(profile.id);

  const handleFollow = async () => {
    setBusy(true);
    try {
      await toggleFollow(user!.id, profile.id, isFollowing);
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["counts", profile.id] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      await subscribeToCreator(user!.id, profile.id, creatorPrice);
      toast.success("Subscribed");
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["tokens"] });
      qc.invalidateQueries({ queryKey: ["counts", profile.id] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="pb-12">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-onyx via-card to-background">
        {creatorProfile?.banner_url && (
          <img src={creatorProfile.banner_url} alt="" className="h-full w-full object-cover opacity-80" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="px-5">
        <div className="-mt-12 flex items-end gap-4">
          <Avatar size="xl" ring={isCreator} username={profile.username} displayName={profile.display_name} avatarUrl={profile.avatar_url} accountType={profile.account_type} />
          <div className="pb-2 flex-1">
            <h1 className="font-serif text-2xl text-foreground">{profile.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-foreground/90">{profile.bio}</p>}

        <div className="mt-4 flex items-center gap-6 text-sm">
          <div><span className="font-semibold text-foreground">{counts?.followers ?? 0}</span> <span className="text-muted-foreground">followers</span></div>
          {isCreator && <div><span className="font-semibold text-foreground">{counts?.subscribers ?? 0}</span> <span className="text-muted-foreground">subscribers</span></div>}
          {isCreator && <div><span className="font-semibold text-foreground">{posts.length}</span> <span className="text-muted-foreground">posts</span></div>}
        </div>

        {!isMe && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button onClick={handleFollow} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm transition hover:border-gold disabled:opacity-50">
              {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {isFollowing ? "Following" : "Follow"}
            </button>
            <button onClick={() => navigate({ to: "/messages/$userId", params: { userId: profile.id } })}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-gold">
              <MessageCircle className="h-4 w-4" /> Message
            </button>
            {isCreator && !isSubscribed && (
              <button onClick={handleSubscribe} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-5 py-2 text-sm font-medium text-primary-foreground shadow-gold disabled:opacity-50">
                <Crown className="h-4 w-4" /> Subscribe · {creatorPrice} TKN
              </button>
            )}
            {isCreator && isSubscribed && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-gold">
                <Crown className="h-4 w-4" /> Subscribed
              </span>
            )}
          </div>
        )}

        {/* Posts grid */}
        {isCreator && (
          <section className="mt-8">
            <h2 className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Gallery</h2>
            {posts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No posts yet
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {posts.map((p: any) => (
                  <LockedMedia
                    key={p.id}
                    contentType="post"
                    contentId={p.id}
                    visibility={p.visibility}
                    price={Number(p.price)}
                    creatorId={p.creator_id}
                    creatorPrice={creatorPrice}
                    isUnlocked={unlocks.has(`post:${p.id}`)}
                    isSubscribed={isSubscribed}
                    isOwner={isMe}
                    mediaUrl={p.media_url}
                    className="aspect-square"
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
