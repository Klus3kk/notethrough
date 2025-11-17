import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-white/15 bg-surface px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-accent-teal focus:outline-none",
        className
      )}
      {...props}
    />
  );
});
