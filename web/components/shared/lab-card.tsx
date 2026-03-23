import type {ReactNode} from 'react';

import {cn} from '@/lib/cn';

export function LabCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-lab backdrop-blur-xl',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,154,61,0.14),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(233,75,53,0.12),_transparent_38%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}
