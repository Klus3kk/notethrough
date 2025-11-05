import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { navItems } from "@/data/dashboard";

export function TopNav() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold tracking-wide">
          NT
        </div>
        <nav className="flex items-center gap-2">
          {navItems.map((item, index) => (
            <Button key={item.id} variant={index === 0 ? "pill" : "ghost"}>
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-muted">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-green-400" />
          Dataset now
        </div>
        <Badge className="bg-white/15 text-foreground">Predict All</Badge>
        <div className="flex items-center gap-3 rounded-full bg-white/5 px-4 py-2">
          <div className="text-right">
            <div className="text-sm font-semibold text-foreground">Bogdan Nikita</div>
            <div className="text-xs text-muted">@niklabs</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#6f46ff] to-[#3d278f]" />
        </div>
      </div>
    </header>
  );
}
