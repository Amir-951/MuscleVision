export function SectionLabel({children}: {children: string}) {
  return (
    <span className="inline-flex items-center border border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.38em] text-mist/62">
      {children}
    </span>
  );
}
