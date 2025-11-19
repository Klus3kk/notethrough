import Link from "next/link";

export function Header() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.4rem] text-white/50">Notethrough</p>
      </div>
    </header>
  );
}
