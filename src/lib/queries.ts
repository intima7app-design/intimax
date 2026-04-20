import { supabase } from "@/integrations/supabase/client";

export async function fetchMyProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, creator_profiles(*)")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchTokenBalance(userId: string) {
  const { data, error } = await supabase
    .from("tokens")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.balance ?? 0);
}

export async function fetchFeed() {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles!posts_creator_id_fkey(id, username, display_name, avatar_url, account_type)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchStories() {
  const { data, error } = await supabase
    .from("stories")
    .select("*, profiles!stories_creator_id_fkey(id, username, display_name, avatar_url)")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchReels() {
  const { data, error } = await supabase
    .from("reels")
    .select("*, profiles!reels_creator_id_fkey(id, username, display_name, avatar_url)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCreators() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, creator_profiles(*)")
    .eq("account_type", "creator")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, creator_profiles(*)")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPostsByCreator(creatorId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyUnlocks(userId: string) {
  const { data, error } = await supabase
    .from("content_unlocks")
    .select("content_type, content_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((u) => `${u.content_type}:${u.content_id}`));
}

export async function fetchMySubscriptions(userId: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("creator_id, status, expires_at")
    .eq("fan_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());
  if (error) throw error;
  return new Set((data ?? []).map((s) => s.creator_id));
}

export async function fetchFollowingCreatorIds(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((f) => f.following_id));
}

export async function fetchConversations(userId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(id, username, display_name, avatar_url)")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  // Group by counterpart
  const map = new Map<string, any>();
  for (const m of data ?? []) {
    const other = m.sender_id === userId ? m.receiver : m.sender;
    if (!other) continue;
    if (!map.has(other.id)) map.set(other.id, { other, lastMessage: m });
  }
  return Array.from(map.values());
}

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTransactions(userId: string) {
  const { data, error } = await supabase
    .from("token_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

/* --------- Mutations --------- */

export async function spendTokens(amount: number, type: string, description: string) {
  const { data, error } = await supabase.rpc("spend_tokens", {
    _amount: amount,
    _type: type as any,
    _description: description,
  });
  if (error) throw error;
  return Number(data);
}

export async function unlockContent(
  contentType: "post" | "reel" | "message",
  contentId: string,
  price: number,
  userId: string,
  creatorId?: string,
) {
  await spendTokens(price, "ppv_unlock", `Unlocked ${contentType}`);
  const { error } = await supabase.from("content_unlocks").insert({
    user_id: userId,
    content_type: contentType,
    content_id: contentId,
    price_paid: price,
  });
  if (error) throw error;

  if (creatorId && creatorId !== userId) {
    await supabase.from("notifications").insert({
      user_id: creatorId,
      actor_id: userId,
      type: "content_unlocked",
      message: `unlocked your ${contentType} for ${price} TKN`,
    });
  }
}

export async function subscribeToCreator(fanId: string, creatorId: string, price: number) {
  await spendTokens(price, "subscription", "Monthly subscription");
  const { error } = await supabase.from("subscriptions").upsert({
    fan_id: fanId,
    creator_id: creatorId,
    status: "active",
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: "fan_id,creator_id" });
  if (error) throw error;

  await supabase.from("notifications").insert({
    user_id: creatorId,
    actor_id: fanId,
    type: "new_subscriber",
    message: "subscribed to your channel",
  });
}

export async function toggleFollow(followerId: string, followingId: string, currentlyFollowing: boolean) {
  if (currentlyFollowing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("follows").insert({
      follower_id: followerId,
      following_id: followingId,
    });
    if (error) throw error;
    await supabase.from("notifications").insert({
      user_id: followingId,
      actor_id: followerId,
      type: "new_follower",
      message: "started following you",
    });
  }
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
) {
  const { error } = await supabase.from("messages").insert({
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    is_unlocked: true,
  });
  if (error) throw error;

  await supabase.from("notifications").insert({
    user_id: receiverId,
    actor_id: senderId,
    type: "new_message",
    message: "sent you a message",
  });
}

export async function tipCreator(fanId: string, creatorId: string, amount: number) {
  await spendTokens(amount, "tip", "Tip");
  await supabase.from("notifications").insert({
    user_id: creatorId,
    actor_id: fanId,
    type: "new_tip",
    message: `tipped you ${amount} TKN`,
  });
}

export async function fetchMessages(userA: string, userB: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
