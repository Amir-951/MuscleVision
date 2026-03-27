'use client';

import {motion} from 'framer-motion';
import Link from 'next/link';
import type {ReactNode} from 'react';

type AuthStageProps = {
  label: string;
  title: string;
  description: string;
  detailHeading?: string;
  detailItems?: string[];
  children: ReactNode;
};

export function AuthStage({
  label,
  title,
  description,
  detailHeading,
  detailItems = [],
  children,
}: AuthStageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-y-0 left-[62%] hidden w-px bg-white/8 lg:block" />
        <div className="absolute left-[6%] top-[16%] h-24 w-24 rounded-full border border-white/10" />
        <div className="absolute bottom-[10%] right-[9%] h-44 w-44 rounded-full border border-white/10" />
        <div className="absolute left-[5%] top-[10%] font-display text-[16vw] leading-none text-white/[0.04]">
          MV
        </div>
      </div>

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 py-5">
        <Link href="/" className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.42em] text-mist/45">MuscleVision</p>
          <p className="font-display text-[1.45rem] text-ivory">Biomechanics Lab</p>
        </Link>

        <div className="hidden items-center gap-4 text-xs uppercase tracking-[0.28em] text-mist/45 md:flex">
          <span>web app</span>
          <span className="h-px w-8 bg-white/10" />
          <span>movement</span>
        </div>
      </header>

      <section className="relative z-10 grid min-h-[calc(100svh-96px)] gap-12 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,460px)] lg:items-center lg:py-14">
        <motion.div
          initial={{opacity: 0, y: 28}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.7}}
          className="flex min-h-full flex-col justify-between gap-10"
        >
          <div className="space-y-5">
            <span className="inline-flex items-center border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.36em] text-mist/62">
              {label}
            </span>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-display text-[3.35rem] leading-[0.9] text-ivory md:text-[5.5rem]">
                {title}
              </h1>
              <p className="max-w-xl text-lg text-mist/64">{description}</p>
            </div>
          </div>

          {detailItems.length ? (
            <div className="grid gap-6 border-t border-white/10 pt-8 md:grid-cols-[220px_minmax(0,1fr)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.36em] text-mist/42">{detailHeading}</p>
              </div>
              <div className="space-y-3">
                {detailItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 border-b border-white/8 pb-3 last:border-b-0">
                    <span className="mt-1 h-2 w-2 rounded-full bg-amber" />
                    <p className="text-sm text-mist/64">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </motion.div>

        <motion.div
          initial={{opacity: 0, x: 22}}
          animate={{opacity: 1, x: 0}}
          transition={{duration: 0.7, delay: 0.1}}
          className="relative"
        >
          <div className="absolute -inset-px rounded-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_24%,rgba(255,255,255,0.08))] opacity-45" />
          <div className="soft-vignette relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,25,0.9),rgba(7,8,11,0.96))]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,162,70,0.11),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(209,79,56,0.12),_transparent_34%)]" />
            <div className="lab-grid pointer-events-none absolute inset-0 opacity-20" />
            <div className="relative px-6 py-6 md:px-8 md:py-8">{children}</div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
