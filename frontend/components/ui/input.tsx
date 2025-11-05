import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-100/60",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
