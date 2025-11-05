"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, onSubmit, placeholder = "Search tracks, artists...", className }: SearchBarProps) {
  return (
    <div className={cn("flex items-center gap-3 rounded-full bg-white/5 px-5 py-2.5", className)}>
      <Search className="h-4 w-4 text-muted" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSubmit?.();
          }
        }}
        placeholder={placeholder}
        className="bg-transparent border-none focus:ring-0 focus:outline-none"
      />
    </div>
  );
}
