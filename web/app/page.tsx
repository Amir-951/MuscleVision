'use client';

import {motion} from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  Orbit,
  ScanSearch,
  Sparkles,
  Waves,
} from 'lucide-react';
import Link from 'next/link';

import {MuscleMannequin} from '@/components/workouts/muscle-mannequin';

const demoEngagement = {
  chest_left: 0.42,
  chest_right: 0.38,
  deltoid_left: 0.68,
  deltoid_right: 0.72,
  bicep_left: 0.44,
  bicep_right: 0.5,
  tricep_left: 0.38,
  tricep_right: 0.35,
  abs_upper: 0.46,
  abs_lower: 0.42,
  oblique_left: 0.3,
  oblique_right: 0.28,
  glute_left: 0.58,
  glute_right: 0.55,
  quad_left: 0.79,
  quad_right: 0.76,
  calf_left: 0.34,
  calf_right: 0.33,
};

const pipeline = [
  {
    step: '01',
    title: 'Capture',
    body: 'Vidéo ou webcam.',
  },
  {
    step: '02',
    title: 'Skeleton',
    body: 'Points du corps et métriques.',
  },
  {
    step: '03',
    title: 'Compression',
    body: '`keypoints.json` et `analysis.txt`.',
  },
  {
    step: '04',
    title: 'Coaching',
    body: 'Coach branché sur le texte.',
  },
];

const details = [
  {
    icon: ScanSearch,
    title: 'Signal brut',
    body: 'Le mouvement passe avant le texte.',
  },
  {
    icon: BrainCircuit,
    title: 'Texte compact',
    body: 'Le coach ne lit qu’un résumé court.',
  },
  {
    icon: Orbit,
    title: '3D utile',
    body: 'Les zones visées se lisent tout de suite.',
  },
];

const markers = [
  {label: 'Symétrie', value: '9.1/10'},
  {label: 'Tempo', value: '2.4s'},
  {label: 'Score', value: '8.4/10'},
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <section className="relative min-h-[100svh] overflow-hidden px-4 pb-10 pt-4 md:px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8vw] top-[10vh] font-display text-[26vw] leading-none text-white/[0.035]">
            MuscleVision
          </div>
          <div className="absolute bottom-[18%] left-[6%] h-[26vw] w-[26vw] rounded-full border border-white/10" />
          <div className="absolute right-[7%] top-[18%] h-20 w-20 rounded-full border border-white/10" />
          <div className="absolute inset-y-0 left-[55%] hidden w-px bg-white/8 xl:block" />
        </div>

        <header className="relative z-10 flex items-center justify-between border-b border-white/10 py-5">
          <Link href="/" className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.42em] text-mist/45">MuscleVision</p>
            <p className="font-display text-[1.55rem] text-ivory">Biomechanics Lab</p>
          </Link>

          <div className="hidden items-center gap-4 text-[11px] uppercase tracking-[0.32em] text-mist/45 md:flex">
            <span>web studio</span>
            <span className="h-px w-10 bg-white/10" />
            <span>movement intelligence</span>
            <span className="h-px w-10 bg-white/10" />
            <span>cost-aware ai</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist/70 transition hover:border-white/20 hover:text-ivory"
            >
              Connexion
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-[linear-gradient(135deg,#d14f38,#f5a246)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Commencer
            </Link>
          </div>
        </header>

        <div className="relative z-10 grid min-h-[calc(100svh-88px)] gap-10 py-8 xl:grid-cols-[minmax(0,1fr)_44vw] xl:items-center xl:py-0">
          <motion.div
            initial={{opacity: 0, y: 34}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.75}}
            className="flex max-w-[820px] flex-col justify-center gap-8 xl:pr-12"
          >
            <div className="space-y-5">
              <span className="inline-flex items-center border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.38em] text-mist/62">
                Mouvement d’abord
              </span>
              <h1 className="max-w-5xl font-display text-[3.9rem] leading-[0.84] text-ivory sm:text-[5rem] xl:text-[7.3rem]">
                MuscleVision lit le mouvement.
              </h1>
              <p className="max-w-xl text-lg text-mist/62">Vidéo, pose, résultat, coach.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#d14f38,#f5a246)] px-6 py-3.5 text-sm font-medium text-white"
              >
                Ouvrir le studio
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3.5 text-sm text-mist/70 transition hover:border-white/20 hover:text-ivory"
              >
                Voir l’app
              </Link>
            </div>

            <div className="grid gap-5 border-t border-white/10 pt-6 md:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-mist/42">Artefacts</p>
                <p className="mt-3 text-lg text-ivory">`keypoints.json` + `analysis.txt`</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-mist/42">Lecture</p>
                <p className="mt-3 text-lg text-ivory">angles, reps, stabilité, symétrie</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-mist/42">Sortie</p>
                <p className="mt-3 text-lg text-ivory">3D musculaire + feedback coach</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{opacity: 0, scale: 0.98}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.85, delay: 0.08}}
            className="relative xl:h-[100svh]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_44%)]" />
            <div className="absolute left-[8%] top-[14%] hidden max-w-[210px] border-t border-white/10 pt-4 text-sm text-mist/58 xl:block">
              La vidéo brute ne part pas au modèle texte.
            </div>
            <div className="absolute bottom-[10%] left-[8%] right-[8%] z-10 hidden gap-4 border-t border-white/10 pt-5 xl:grid xl:grid-cols-3">
              {markers.map((marker) => (
                <div key={marker.label}>
                  <p className="text-[11px] uppercase tracking-[0.34em] text-mist/42">{marker.label}</p>
                  <p className="mt-3 font-display text-3xl text-ivory">{marker.value}</p>
                </div>
              ))}
            </div>
            <div className="relative h-[58vh] xl:h-full">
              <MuscleMannequin muscleEngagement={demoEngagement} className="h-full w-full" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-[1560px] border-t border-white/10 pt-10">
          <div className="grid gap-10 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.38em] text-mist/45">Pipeline</p>
              <h2 className="mt-4 max-w-sm font-display text-[2.7rem] leading-[0.92] text-ivory md:text-[3.6rem]">
                Une chaîne courte.
              </h2>
            </div>

            <div className="grid gap-0 border-t border-white/10 md:grid-cols-2 md:border-t-0 xl:grid-cols-4">
              {pipeline.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{opacity: 0, y: 20}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-10%'}}
                  transition={{duration: 0.55, delay: index * 0.07}}
                  className="border-b border-white/10 py-7 md:border-b-0 md:px-6 md:py-0 md:first:pl-0 md:[&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-white/10"
                >
                  <p className="font-display text-[2.5rem] leading-none text-white/22">{item.step}</p>
                  <h3 className="mt-6 text-xl text-ivory">{item.title}</h3>
                  <p className="mt-4 text-sm text-mist/62">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-[1560px] gap-12 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <motion.div
            initial={{opacity: 0, y: 24}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.65}}
            className="border-t border-white/10 pt-8"
          >
            <p className="text-[11px] uppercase tracking-[0.38em] text-mist/45">Positionnement</p>
            <h2 className="mt-5 max-w-xl font-display text-[2.8rem] leading-[0.92] text-ivory md:text-[4.2rem]">
              Une lecture nette, sans bruit.
            </h2>
            <p className="mt-6 max-w-lg text-lg text-mist/62">Le mouvement reste au centre.</p>
          </motion.div>

          <div className="space-y-0 border-t border-white/10">
            {details.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{opacity: 0, x: 18}}
                  whileInView={{opacity: 1, x: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.55, delay: index * 0.08}}
                  className="grid gap-5 border-b border-white/10 py-7 md:grid-cols-[72px_minmax(0,1fr)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-amber">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl text-ivory">{item.title}</h3>
                    <p className="mt-3 max-w-xl text-base text-mist/62">{item.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-8 md:px-6 md:pb-24">
        <motion.div
          initial={{opacity: 0, y: 24}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true}}
          transition={{duration: 0.65}}
          className="mx-auto max-w-[1560px] border border-white/10 px-6 py-8 md:px-10 md:py-10"
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-[0.38em] text-mist/45">Entrée</p>
              <h2 className="max-w-4xl font-display text-[3rem] leading-[0.9] text-ivory md:text-[4.6rem]">
                Capture. Lis. Corrige.
              </h2>
              <p className="max-w-2xl text-lg text-mist/62">Analyse, coach et nutrition dans une même app.</p>
            </div>

            <div className="space-y-4">
              <Link
                href="/auth/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#d14f38,#f5a246)] px-6 py-3.5 text-sm font-medium text-white"
              >
                Créer un accès
                <Sparkles className="h-4 w-4" />
              </Link>
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-[11px] uppercase tracking-[0.32em] text-mist/45">
                <span>webcam</span>
                <Waves className="h-4 w-4 text-amber" />
                <span>upload</span>
                <Waves className="h-4 w-4 text-amber" />
                <span>coach</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
