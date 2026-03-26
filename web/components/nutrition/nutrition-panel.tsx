'use client';

import {Camera, Drumstick, Flame, Salad} from 'lucide-react';
import {useEffect, useState} from 'react';

import {SectionLabel} from '@/components/shared/section-label';
import {useAuth} from '@/components/providers/auth-provider';
import {analyzeFoodPhoto, getTodayNutritionLog, logFood} from '@/lib/api';
import type {NutritionAnalysisResult, TodayLogResponse} from '@/lib/types';

const mealOptions = ['breakfast', 'lunch', 'dinner', 'snack'];

export function NutritionPanel() {
  const {user} = useAuth();
  const [analysis, setAnalysis] = useState<NutritionAnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mealType, setMealType] = useState('lunch');
  const [dailyLog, setDailyLog] = useState<TodayLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void getTodayNutritionLog(user.id)
      .then((payload) => {
        setDailyLog(payload);
        setError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Chargement nutrition impossible.');
      });
  }, [user?.id]);

  async function handleAnalyze(file: File) {
    try {
      setError(null);
      setSelectedFile(file);
      const result = await analyzeFoodPhoto(file);
      setAnalysis(result);
    } catch (analyzeError) {
      setAnalysis(null);
      setError(analyzeError instanceof Error ? analyzeError.message : 'Analyse photo impossible.');
    }
  }

  async function handleLog() {
    if (!user?.id || !analysis) {
      return;
    }

    try {
      setError(null);
      await logFood({
        userId: user.id,
        mealType,
        foodName: analysis.dishName,
        calories: analysis.estimatedCalories,
        proteinG: analysis.proteinG,
        carbsG: analysis.carbsG,
        fatG: analysis.fatG,
        source: 'photo_ai',
      });

      const refresh = await getTodayNutritionLog(user.id);
      setDailyLog(refresh);
    } catch (logError) {
      setError(logError instanceof Error ? logError.message : 'Enregistrement impossible.');
    }
  }

  return (
    <div className="grid gap-12 xl:grid-cols-[minmax(0,1.18fr)_360px]">
      <section className="space-y-8">
        <div className="space-y-4 border-b border-white/10 pb-8">
          <SectionLabel>Meal intake</SectionLabel>
          <h1 className="max-w-[11ch] font-display text-[3.2rem] leading-[0.88] text-ivory md:text-[4.8rem]">
            Photo, lecture, journal.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-mist/62">
            La nutrition doit ressembler à une routine claire: capturer un repas, confirmer la lecture, l’inscrire dans la journée.
          </p>
        </div>

        <label className="group relative flex min-h-[520px] cursor-pointer overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_22%_18%,rgba(196,255,115,0.14),transparent_24%),linear-gradient(180deg,#10141a_0%,#090b0f_100%)]">
          <div className="absolute inset-0 lab-grid opacity-55" />
          <div className="absolute left-[14%] top-[18%] h-28 w-28 rounded-full border border-white/10" />
          <div className="absolute right-[12%] top-[22%] h-40 w-40 rounded-full border border-white/10" />
          <div className="absolute inset-x-[14%] bottom-[14%] h-[28%] rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.05))]" />
          <div className="relative flex w-full flex-col justify-between p-8 md:p-10">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-[0.34em] text-mist/45">Meal camera</p>
              <h2 className="max-w-[10ch] font-display text-[2.7rem] leading-[0.9] text-ivory md:text-[3.8rem]">
                Dépose une photo de repas.
              </h2>
              <p className="max-w-xl text-base leading-8 text-mist/64">
                Une image entre, une lecture macro sort, puis le log du jour se met à jour sans détour.
              </p>
            </div>

            <div className="space-y-4">
              <span className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-5 py-3 text-sm text-ivory">
                <Camera className="h-4 w-4 text-amber" />
                Choisir une photo
              </span>
              <p className="text-sm text-mist/55">jpg, png, webp</p>
              {selectedFile ? (
                <p className="text-sm text-mist/58">Photo sélectionnée: {selectedFile.name}</p>
              ) : null}
              {error ? <p className="text-sm text-[#ff8d8d]">{error}</p> : null}
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleAnalyze(file);
              }
            }}
          />
        </label>

        {analysis ? (
          <div className="grid gap-6 border-t border-white/10 pt-8 md:grid-cols-2">
            <div className="space-y-3 border-b border-white/10 pb-5 md:border-b-0 md:pb-0">
              <p className="text-[11px] uppercase tracking-[0.3em] text-mist/38">Plat détecté</p>
              <p className="text-3xl text-ivory">{analysis.dishName}</p>
              <p className="text-sm leading-7 text-mist/58">{analysis.notes}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-mist/56">
                  <Flame className="h-4 w-4 text-amber" />
                  Calories
                </div>
                <p className="font-display text-[2.6rem] leading-none text-ivory">{analysis.estimatedCalories}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-mist/56">
                  <Drumstick className="h-4 w-4 text-amber" />
                  Macros
                </div>
                <p className="text-lg text-ivory">
                  P {analysis.proteinG}g · C {analysis.carbsG}g · F {analysis.fatG}g
                </p>
                <p className="text-sm text-mist/56">{analysis.confidencePercent}% confiance</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <select
                value={mealType}
                onChange={(event) => setMealType(event.target.value)}
                className="rounded-full border border-white/10 bg-transparent px-4 py-3 text-sm text-ivory outline-none"
              >
                {mealOptions.map((option) => (
                  <option key={option} value={option} className="bg-graphite">
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleLog()}
                className="rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-5 py-3 text-sm font-medium text-white"
              >
                Enregistrer dans le journal
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="space-y-8 border-t border-white/10 pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Day totals</p>
          <div className="grid gap-5">
            <div className="border-b border-white/10 pb-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-mist/34">Calories</p>
              <p className="mt-2 font-display text-[2.8rem] leading-none text-ivory">
                {dailyLog?.totals.calories ?? 0}
              </p>
            </div>
            <div className="border-b border-white/10 pb-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-mist/34">Macros</p>
              <p className="mt-2 text-sm leading-7 text-ivory">
                P {dailyLog?.totals.proteinG ?? 0} · C {dailyLog?.totals.carbsG ?? 0} · F {dailyLog?.totals.fatG ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Journal du jour</p>
          {dailyLog?.entries.map((entry) => (
            <div key={entry.id} className="border-b border-white/10 pb-4">
              <p className="text-sm text-ivory">{entry.foodName}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-mist/38">
                {entry.mealType} · {entry.source}
              </p>
              <p className="mt-2 text-sm leading-7 text-mist/56">
                {entry.calories ?? 0} kcal · P {entry.proteinG ?? 0} · C {entry.carbsG ?? 0} · F {entry.fatG ?? 0}
              </p>
            </div>
          ))}

          {!dailyLog?.entries.length ? (
            <div className="border-b border-white/10 pb-4 text-sm text-mist/52">
              Aucun repas journalisé aujourd’hui.
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
