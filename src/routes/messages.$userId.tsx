import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { fetchMessages, sendMessage } from "@/lib/queries";
import { LockedMedia } from "@/components/locked-media";

export const Route = createFileRoute("/messages/$userId")({
  component: () => (<RequireAuth><AppShell><Conversation /></AppShell></RequireAuth>),
});

function Conversation() {
  const { userId: otherId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: other } = useQuery({
    queryKey: ["profile", otherId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", otherId).maybeSingle();
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", user!.id, otherId],
    queryFn: () => fetchMessages(user!.id, otherId),
    refetchInterval: 4000,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setText("");
    try {
      await sendMessage(user!.id, otherId, v);
      qc.invalidateQueries({ queryKey: ["messages", user!.id, otherId] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex h-[calc(100dvh-180px)] flex-col p-4">
      {other && (
        <header className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <Avatar size="md" username={other.username} displayName={other.display_name} avatarUrl={other.avatar_url} accountType={other.account_type} />
          <div>
            <p className="font-medium">{other.display_name}</p>
            <p className="text-xs text-muted-foreground">@{other.username}</p>
          </div>
        </header>
      )}

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-1 py-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Start the conversation.</p>
        )}
        {messages.map((m: any) => {
          const mine = m.sender_id === user!.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                mine ? "bg-gradient-gold text-primary-foreground" : "bg-card border border-border"
              }`}>
                {m.media_url && m.ppv_price > 0 && (
                  <LockedMedia
                    contentType="message"
                    contentId={m.id}
                    visibility="ppv"
                    price={Number(m.ppv_price)}
                    creatorId={m.sender_id}
                    isUnlocked={!!m.is_unlocked}
                    isSubscribed={false}
                    isOwner={mine}
                    mediaUrl={m.media_url}
                    className="mb-2 aspect-[4/5] w-64"
                  />
                )}
                {m.content && <p>{m.content}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={onSend} className="mt-2 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message..."
          className="flex-1 rounded-full border border-input bg-card px-5 py-3 outline-none focus:border-gold"
        />
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold">
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
