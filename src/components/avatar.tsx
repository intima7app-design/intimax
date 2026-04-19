import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface Props {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  accountType?: "creator" | "fan" | string | null;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
  linkTo?: boolean;
}

const SIZES = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base", xl: "h-24 w-24 text-2xl" };

export function Avatar({ username, displayName, avatarUrl, accountType, size = "md", ring, linkTo }: Props) {
  const isFan = accountType === "fan";
  const initial = (displayName || username || "?").trim().charAt(0).toUpperCase();

  const inner = (
    <div className={cn(
      "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
      SIZES[size],
      ring && "p-[2px] bg-gradient-gold",
    )}>
      <div className={cn("flex h-full w-full items-center justify-center overflow-hidden rounded-full", isFan ? "bg-muted text-muted-foreground" : "bg-onyx")}>
        {!isFan && avatarUrl ? (
          <img src={avatarUrl} alt={displayName ?? ""} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="font-serif">{isFan ? "—" : initial}</span>
        )}
      </div>
    </div>
  );

  if (linkTo && username) {
    return <Link to="/u/$username" params={{ username }}>{inner}</Link>;
  }
  return inner;
}
