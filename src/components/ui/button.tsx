import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-background hover:bg-[#d98f08] disabled:opacity-60",
  ghost: "text-muted hover:bg-surface hover:text-foreground",
  outline: "border border-border text-foreground hover:border-accent/50",
  danger: "text-red-400 hover:bg-surface hover:text-red-300",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-3.5 text-sm",
  icon: "h-9 w-9",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
