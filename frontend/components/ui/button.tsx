import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "pill";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-100/60";
    const variants = {
      primary: "bg-white/15 hover:bg-white/25 px-5 py-2 text-sm font-semibold",
      ghost: "bg-transparent hover:bg-white/10 px-3 py-2 text-sm",
      pill: "bg-white text-background px-5 py-2 text-sm font-semibold shadow-glow"
    } as const;

    return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />;
  }
);
Button.displayName = "Button";
