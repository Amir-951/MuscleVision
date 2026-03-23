export function SectionLabel({children}: {children: string}) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.34em] text-mist/70">
      {children}
    </span>
  );
}
