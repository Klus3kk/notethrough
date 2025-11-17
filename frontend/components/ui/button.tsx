import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold tracking-wide transition";
  const variants = {
    primary: "bg-accent-coral text-black hover:bg-accent-lime",
    secondary: "border border-white/30 text-white/90 hover:border-white/70",
    ghost: "text-white/70 hover:text-white"
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
