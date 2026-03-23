'use client';

import {motion} from 'framer-motion';
import Link from 'next/link';
import {ArrowRight, BarChart3, BrainCircuit, ScanSearch} from 'lucide-react';

import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
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

const features = [
  {
    title: 'Analyse biomécanique compacte',
    body: 'Le moteur extrait d’abord le squelette, résume les angles, la stabilité et la symétrie dans un texte dense, puis garde l’IA pour le conseil.',
    icon: ScanSearch,
  },
  {
    title: 'Feedback low-cost piloté par texte',
    body: 'Le modèle ne voit jamais la vidéo brute. Il ne reçoit qu’un résumé compact `analysis.txt` pour limiter le coût et rester plus contrôlable.',
    icon: BrainCircuit,
  },
  {
    title: 'Visualisation studio-grade',
    body: 'Un mannequin 3D stylisé rend les activations musculaires, pendant que les métriques de séance restent lisibles côté coaching et progression.',
    icon: BarChart3,
  },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 md:px-6 md:pt-10">
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-mist/50">MuscleVision Web</p>
            <p className="font-display text-xl text-ivory">Biomechanics Lab</p>
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
              className="rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Accéder au lab
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-8 px-4 pb-10 md:px-6 xl:grid-cols-[minmax(0,1.08fr)_520px]">
        <motion.div
          initial={{opacity: 0, y: 24}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.65}}
          className="space-y-6"
        >
          <SectionLabel>Biomechanics first</SectionLabel>
          <div className="space-y-5">
            <h1 className="max-w-4xl font-display text-[3rem] leading-[0.92] text-ivory md:text-[5.7rem]">
              Le web studio qui transforme tes mouvements en données utiles, puis en coaching sobre.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-mist/65">
              Upload vidéo ou capture webcam, extraction de pose, artefacts `json/txt`,
              visualisation musculaire 3D et copilote fitness branché sur du texte compact.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-6 py-3.5 text-sm font-medium text-white"
            >
              Lancer une analyse
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3.5 text-sm text-mist/70 transition hover:border-white/20 hover:text-ivory"
            >
              Ouvrir l’app
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {label: 'Artefacts', value: 'keypoints.json + analysis.txt'},
              {label: 'Signal', value: 'angles, reps, stabilité, symétrie'},
              {label: 'Sortie', value: '3D heat + feedback coach'},
            ].map((item) => (
              <LabCard key={item.label} className="p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-mist/45">{item.label}</p>
                <p className="mt-3 text-lg text-ivory">{item.value}</p>
              </LabCard>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{opacity: 0, scale: 0.98}}
          animate={{opacity: 1, scale: 1}}
          transition={{duration: 0.75, delay: 0.1}}
        >
          <LabCard className="overflow-hidden p-0">
            <div className="grid gap-4 border-b border-white/10 p-6 lg:grid-cols-[minmax(0,1fr)_180px]">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Live preview</p>
                <h2 className="mt-2 text-2xl text-ivory">Movement to insight, without wasting tokens.</h2>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-mist/60">
                squat · 84/100
                <br />
                8 reps · 2.4s/rep
                <br />
                symmetry 91%
              </div>
            </div>
            <MuscleMannequin muscleEngagement={demoEngagement} className="h-[560px] w-full" />
          </LabCard>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-10 md:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{opacity: 0, y: 18}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{delay: index * 0.08, duration: 0.55}}
              >
                <LabCard className="h-full p-6">
                  <Icon className="h-6 w-6 text-amber" />
                  <h3 className="mt-6 text-2xl text-ivory">{feature.title}</h3>
                  <p className="mt-4 text-base leading-8 text-mist/60">{feature.body}</p>
                </LabCard>
              </motion.div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
