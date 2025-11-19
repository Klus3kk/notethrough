import { Button } from "@/components/ui/button";

interface HeroProps {
  title: string;
  description: string;
  tags: string[];
  actionLabel?: string;
}

export function Hero({ title, description, tags, actionLabel }: HeroProps) {
  return (
    <section className="fade-in space-y-6 py-4">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.4rem] text-white/50">Experience</p>
        <h2 className="text-4xl font-semibold leading-tight text-foreground">{title}</h2>
        <p className="max-w-3xl text-base text-white/75">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-accent-teal">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-accent-teal/10 px-4 py-1 text-accent-teal">
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
