'use client';

import {motion} from 'framer-motion';
import type {CSSProperties} from 'react';

import {cn} from '@/lib/cn';

import type {CoachPersona} from './coach-personas';

function sceneBackground(persona: CoachPersona): CSSProperties {
  return {
    background: [
      `radial-gradient(circle at 22% 22%, ${persona.palette.glow}30, transparent 22%)`,
      `radial-gradient(circle at 82% 18%, ${persona.palette.accent}22, transparent 24%)`,
      `linear-gradient(145deg, ${persona.palette.base} 0%, #090b0f 100%)`,
    ].join(','),
  };
}

function stageGlow(persona: CoachPersona): CSSProperties {
  return {
    background: `radial-gradient(circle at 50% 62%, ${persona.palette.haze} 0%, transparent 58%)`,
  };
}

function sceneArchitecture(persona: CoachPersona) {
  switch (persona.scene) {
    case 'warmup_deck':
      return (
        <>
          <div
            className="absolute left-1/2 top-[18%] h-24 w-24 -translate-x-1/2 rounded-full blur-sm"
            style={{
              background: `radial-gradient(circle, ${persona.palette.glow} 0%, ${persona.palette.accent} 54%, transparent 72%)`,
            }}
          />
          <div
            className="absolute inset-x-[8%] bottom-[18%] h-[1px]"
            style={{background: `linear-gradient(90deg, transparent, ${persona.palette.edge}, transparent)`}}
          />
          <div
            className="absolute inset-x-[10%] bottom-[14%] h-[24%] rounded-[30px_30px_12px_12px] border"
            style={{
              borderColor: `${persona.palette.line}55`,
              background: `linear-gradient(180deg, ${persona.palette.haze}10, ${persona.palette.haze}45)`,
            }}
          />
          <div
            className="absolute bottom-[17%] left-[12%] h-[1px] w-[34%] rotate-[8deg]"
            style={{background: `linear-gradient(90deg, transparent, ${persona.palette.line}aa)`}}
          />
          <div
            className="absolute bottom-[20%] right-[12%] h-[1px] w-[34%] -rotate-[8deg]"
            style={{background: `linear-gradient(90deg, ${persona.palette.line}aa, transparent)`}}
          />
        </>
      );
    case 'drill_hall':
      return (
        <>
          <div
            className="absolute inset-x-[7%] top-[14%] h-[1px]"
            style={{background: `linear-gradient(90deg, transparent, ${persona.palette.edge}, transparent)`}}
          />
          <div
            className="absolute inset-x-[10%] bottom-[18%] h-[32%] rounded-[18px] border"
            style={{
              borderColor: `${persona.palette.line}55`,
              background: `linear-gradient(180deg, transparent, ${persona.palette.haze}35)`,
            }}
          />
          <div
            className="absolute left-[18%] top-[18%] h-[52%] w-[1px]"
            style={{background: `linear-gradient(${persona.palette.line}, transparent)`}}
          />
          <div
            className="absolute right-[18%] top-[18%] h-[52%] w-[1px]"
            style={{background: `linear-gradient(${persona.palette.line}, transparent)`}}
          />
          <div
            className="absolute left-1/2 top-[26%] h-20 w-20 -translate-x-1/2 rounded-full border"
            style={{borderColor: `${persona.palette.edge}55`}}
          />
          <div
            className="absolute left-1/2 top-[36%] h-[1px] w-28 -translate-x-1/2"
            style={{background: `linear-gradient(90deg, transparent, ${persona.palette.edge}, transparent)`}}
          />
        </>
      );
    case 'iron_cathedral':
      return (
        <>
          <div
            className="absolute left-1/2 top-[10%] h-44 w-52 -translate-x-1/2 rounded-[999px_999px_0_0] border"
            style={{
              borderColor: `${persona.palette.line}60`,
              background: `linear-gradient(180deg, ${persona.palette.haze}20, transparent)`,
            }}
          />
          <div
            className="absolute inset-x-[15%] bottom-[18%] h-[1px]"
            style={{background: `linear-gradient(90deg, transparent, ${persona.palette.edge}, transparent)`}}
          />
          <div
            className="absolute bottom-[18%] left-[18%] h-[34%] w-6 rounded-t-full border"
            style={{borderColor: `${persona.palette.line}55`, background: `${persona.palette.haze}18`}}
          />
          <div
            className="absolute bottom-[18%] right-[18%] h-[34%] w-6 rounded-t-full border"
            style={{borderColor: `${persona.palette.line}55`, background: `${persona.palette.haze}18`}}
          />
        </>
      );
    default:
      return (
        <>
          <div
            className="absolute left-1/2 top-[14%] h-40 w-40 -translate-x-1/2 rounded-full border"
            style={{borderColor: `${persona.palette.line}55`}}
          />
          <div
            className="absolute left-1/2 top-[20%] h-28 w-28 -translate-x-1/2 rounded-full border"
            style={{borderColor: `${persona.palette.edge}55`}}
          />
          <div
            className="absolute inset-x-[12%] bottom-[18%] h-[24%] rounded-[24px] border"
            style={{
              borderColor: `${persona.palette.line}45`,
              background: `linear-gradient(180deg, transparent, ${persona.palette.haze}35)`,
            }}
          />
        </>
      );
  }
}

function avatarBust(persona: CoachPersona, compact: boolean) {
  const headSize = compact ? 'h-16 w-16' : 'h-20 w-20';
  const torsoWidth = compact ? 'w-28' : 'w-36';
  const torsoHeight = compact ? 'h-20' : 'h-24';

  return (
    <div className="absolute inset-x-0 bottom-[10%] flex justify-center">
      <motion.div
        animate={{y: [0, -6, 0]}}
        transition={{duration: 7.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut'}}
        className="relative"
      >
        <div
          className="absolute left-1/2 top-2 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl"
          style={{background: `${persona.palette.accent}33`}}
        />
        <div className={cn('relative mx-auto rounded-full border', headSize)} style={{
          borderColor: `${persona.palette.edge}88`,
          background: `radial-gradient(circle at 40% 30%, ${persona.palette.edge}, ${persona.palette.accent} 82%)`,
          boxShadow: `0 0 34px ${persona.palette.glow}25`,
        }}>
          {persona.scene === 'lab_orbit' ? (
            <div
              className="absolute left-1/2 top-[44%] h-5 w-14 -translate-x-1/2 rounded-full border"
              style={{borderColor: `${persona.palette.base}aa`}}
            />
          ) : null}
          {persona.scene === 'drill_hall' ? (
            <div
              className="absolute left-1/2 top-1 h-2 w-10 -translate-x-1/2 rounded-full"
              style={{background: persona.palette.base}}
            />
          ) : null}
          {persona.scene === 'iron_cathedral' ? (
            <div
              className="absolute bottom-2 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full"
              style={{background: persona.palette.base}}
            />
          ) : null}
        </div>
        <div
          className={cn('relative mx-auto -mt-2 rounded-[44px_44px_24px_24px] border', torsoWidth, torsoHeight)}
          style={{
            borderColor: `${persona.palette.edge}40`,
            background: `linear-gradient(180deg, ${persona.palette.base} 0%, ${persona.palette.haze} 100%)`,
          }}
        >
          <div
            className="absolute inset-x-[18%] top-3 h-[1px]"
            style={{background: `linear-gradient(90deg, transparent, ${persona.palette.edge}, transparent)`}}
          />
          <div
            className="absolute inset-x-[24%] bottom-5 h-8 rounded-[18px]"
            style={{background: `linear-gradient(180deg, ${persona.palette.accent}16, transparent)`}}
          />
          {persona.scene === 'drill_hall' ? (
            <>
              <div className="absolute left-3 top-3 h-3 w-7 rounded-sm" style={{background: `${persona.palette.line}55`}} />
              <div className="absolute right-3 top-3 h-3 w-7 rounded-sm" style={{background: `${persona.palette.line}55`}} />
            </>
          ) : null}
          {persona.scene === 'iron_cathedral' ? (
            <div
              className="absolute left-1/2 top-5 h-6 w-20 -translate-x-1/2 rounded-full border"
              style={{borderColor: `${persona.palette.edge}40`}}
            />
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

export function CoachAvatarScene({
  persona,
  className,
  compact = false,
  showMeta = false,
}: {
  persona: CoachPersona;
  className?: string;
  compact?: boolean;
  showMeta?: boolean;
}) {
  return (
    <motion.div
      key={persona.id}
      initial={{opacity: 0, y: 12}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: 'easeOut'}}
      className={cn(
        'relative overflow-hidden rounded-[30px] border border-white/10',
        compact ? 'h-28' : 'h-[280px]',
        className,
      )}
      style={sceneBackground(persona)}
    >
      <div className="absolute inset-0 opacity-80 lab-grid" />
      <div className="absolute inset-0" style={stageGlow(persona)} />
      <div
        className="absolute inset-x-0 bottom-0 h-[48%]"
        style={{background: `linear-gradient(180deg, transparent, ${persona.palette.base}cc 58%, #06070a 100%)`}}
      />
      <div
        className="absolute inset-0"
        style={{background: `linear-gradient(90deg, transparent 0%, ${persona.palette.edge}12 50%, transparent 100%)`}}
      />
      <div className="absolute inset-0">{sceneArchitecture(persona)}</div>
      {avatarBust(persona, compact)}

      {showMeta && !compact ? (
        <div className="absolute inset-x-0 top-0 p-6">
          <p className="text-[10px] uppercase tracking-[0.34em] text-mist/60">{persona.environment}</p>
          <h3 className="mt-3 max-w-[280px] font-display text-4xl leading-none text-ivory">{persona.name}</h3>
          <p className="mt-2 max-w-[280px] text-sm leading-6 text-mist/72">{persona.environmentNote}</p>
        </div>
      ) : null}
    </motion.div>
  );
}
