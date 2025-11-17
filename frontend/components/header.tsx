import Link from "next/link";

export function Header() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.4rem] text-white/50">Notethrough</p>
        <h1 className="text-2xl font-semibold text-white">Blend Studio</h1>
      </div>
      <nav className="flex items-center gap-4 text-sm text-white/70">
        <Link href="#explore" className="hover:text-white">
          Studio
        </Link>
        <Link href="#roadmap" className="hover:text-white">
          Roadmap
        </Link>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white">
          Docs
        </a>
      </nav>
    </header>
  );
}
