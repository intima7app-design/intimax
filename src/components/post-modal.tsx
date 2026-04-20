import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LockedMedia } from "@/components/locked-media";
import { Avatar } from "@/components/avatar";
import { formatDistanceToNow } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  post: any | null;
  creator: { username: string; display_name: string; avatar_url: string | null; account_type: string };
  creatorPrice: number;
  isUnlocked: boolean;
  isSubscribed: boolean;
  isOwner: boolean;
}

export function PostModal({ open, onOpenChange, post, creator, creatorPrice, isUnlocked, isSubscribed, isOwner }: Props) {
  if (!post) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-background border-border p-0 sm:max-w-lg">
        <header className="flex items-center gap-3 border-b border-border p-4">
          <Avatar size="md" username={creator.username} displayName={creator.display_name} avatarUrl={creator.avatar_url} accountType={creator.account_type} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{creator.display_name}</p>
            <p className="text-xs text-muted-foreground">@{creator.username} · {formatDistanceToNow(post.created_at)}</p>
          </div>
        </header>
        <LockedMedia
          contentType="post"
          contentId={post.id}
          visibility={post.visibility}
          price={Number(post.price)}
          creatorId={post.creator_id}
          creatorPrice={creatorPrice}
          isUnlocked={isUnlocked}
          isSubscribed={isSubscribed}
          isOwner={isOwner}
          mediaUrl={post.media_url}
          mediaType={post.media_type}
          aspectRatio={(post.aspect_ratio ?? "1:1").replace(":", " / ")}
          mediaPosition={post.media_position}
          className="rounded-none"
        />
        {post.caption && <p className="p-4 leading-relaxed text-foreground/90">{post.caption}</p>}
      </DialogContent>
    </Dialog>
  );
}
