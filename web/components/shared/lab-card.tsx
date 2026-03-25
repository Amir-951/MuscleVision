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
        'soft-vignette relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-6 backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)]',
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  );
}
