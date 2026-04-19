import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/create")({
  component: () => (<RequireAuth><AppShell><CreatePage /></AppShell></RequireAuth>),
});

function CreatePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [visibility, setVisibility] = useState<"free" | "subscribers" | "ppv">("free");
  const [price, setPrice] = useState(10);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("posts").insert({
      creator_id: user!.id,
      caption: caption || null,
      media_url: mediaUrl || null,
      media_type: "image",
      visibility,
      price: visibility === "ppv" ? price : 0,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Posted");
    qc.invalidateQueries({ queryKey: ["feed"] });
    navigate({ to: "/feed" });
  };

  return (
    <div className="p-5">
      <h1 className="font-serif text-2xl text-gradient-gold">New post</h1>
      <p className="mt-1 text-sm text-muted-foreground">Share an artifact with your audience.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Caption">
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-gold" />
        </Field>
        <Field label="Image URL (optional)">
          <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..."
            className="w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-gold" />
        </Field>
        <Field label="Visibility">
          <div className="grid grid-cols-3 gap-2">
            {(["free", "subscribers", "ppv"] as const).map((v) => (
              <button type="button" key={v} onClick={() => setVisibility(v)}
                className={`rounded-xl border px-3 py-2.5 text-sm capitalize transition ${
                  visibility === v ? "border-gold bg-gold/10 text-gold" : "border-border bg-card text-muted-foreground"
                }`}>{v}</button>
            ))}
          </div>
        </Field>
        {visibility === "ppv" && (
          <Field label="PPV price (TKN)">
            <input type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-gold" />
          </Field>
        )}
        <button disabled={busy} className="w-full rounded-full bg-gradient-gold py-3 font-medium text-primary-foreground shadow-gold disabled:opacity-50">
          {busy ? "Posting..." : "Publish"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
