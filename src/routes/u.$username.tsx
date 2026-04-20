import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Crown, MessageCircle, UserPlus, UserMinus, Lock, Pencil, Play } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { PostModal } from "@/components/post-modal";
import { useAuth } from "@/lib/auth-context";
import {
  fetchProfileByUsername, fetchPostsByCreator, fetchMyUnlocks, fetchMySubscriptions,
  fetchFollowingCreatorIds, toggleFollow, subscribeToCreator,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/u/$username")({
  component: () => (<RequireAuth><AppShell><ProfilePage /></AppShell></RequireAuth>),
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [openPost, setOpenPost] = useState<any | null>(null);

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
          <img
            src={creatorProfile.banner_url}
            alt=""
            className="h-full w-full object-cover opacity-80"
            style={{ objectPosition: creatorProfile?.banner_position ?? "50% 50%" }}
            loading="lazy"
          />
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

        {isMe ? (
          <div className="mt-5">
            <button onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm transition hover:border-gold">
              <Pencil className="h-4 w-4" /> Edit profile
            </button>
          </div>
        ) : (
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
              <div className="grid grid-cols-3 gap-1">
                {posts.map((p: any) => {
                  const accessible = isMe || p.visibility === "free" ||
                    (p.visibility === "subscribers" && isSubscribed) ||
                    (p.visibility === "ppv" && unlocks.has(`post:${p.id}`));
                  const locked = !accessible;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setOpenPost(p)}
                      className="group relative aspect-square overflow-hidden bg-onyx"
                    >
                      {p.media_url ? (
                        p.media_type === "video" ? (
                          <video
                            src={p.media_url}
                            muted
                            playsInline
                            preload="metadata"
                            className={cn("h-full w-full object-cover transition group-hover:scale-105",
                              locked && "blur-xl scale-110")}
                            style={{ objectPosition: p.media_position ?? "50% 50%" }}
                          />
                        ) : (
                          <img
                            src={p.media_url}
                            alt=""
                            loading="lazy"
                            className={cn("h-full w-full object-cover transition group-hover:scale-105",
                              locked && "blur-xl scale-110")}
                          />
                        )
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
                          {p.caption?.slice(0, 50) ?? "Post"}
                        </div>
                      )}

                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-gold/30">
                            <Lock className="h-4 w-4 text-gold" />
                          </div>
                        </div>
                      )}

                      {!locked && p.media_type === "video" && (
                        <div className="absolute right-2 top-2 rounded-full bg-black/60 p-1">
                          <Play className="h-3 w-3 fill-white text-white" />
                        </div>
                      )}

                      {p.visibility === "ppv" && !locked && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-gold/90 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary-foreground">
                          PPV
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {isMe && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          userId={user!.id}
          isCreator={isCreator}
          initial={{
            username: profile.username,
            display_name: profile.display_name,
            bio: profile.bio,
            avatar_url: profile.avatar_url,
            banner_url: creatorProfile?.banner_url ?? null,
            banner_position: creatorProfile?.banner_position ?? "50% 50%",
            subscription_price: Number(creatorProfile?.subscription_price ?? 9.99),
          }}
        />
      )}

      <PostModal
        open={!!openPost}
        onOpenChange={(v) => !v && setOpenPost(null)}
        post={openPost}
        creator={{
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          account_type: profile.account_type,
        }}
        creatorPrice={creatorPrice}
        isUnlocked={openPost ? unlocks.has(`post:${openPost.id}`) : false}
        isSubscribed={isSubscribed}
        isOwner={isMe}
      />
    </div>
  );
}
