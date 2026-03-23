'use client';

import {Camera, Drumstick, Flame, Salad} from 'lucide-react';
import {useEffect, useState} from 'react';

import {useAuth} from '@/components/providers/auth-provider';
import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
import {analyzeFoodPhoto, getTodayNutritionLog, logFood} from '@/lib/api';
import type {NutritionAnalysisResult, TodayLogResponse} from '@/lib/types';

const mealOptions = ['breakfast', 'lunch', 'dinner', 'snack'];

export function NutritionPanel() {
  const {user} = useAuth();
  const [analysis, setAnalysis] = useState<NutritionAnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mealType, setMealType] = useState('lunch');
  const [dailyLog, setDailyLog] = useState<TodayLogResponse | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void getTodayNutritionLog(user.id).then(setDailyLog);
  }, [user?.id]);

  async function handleAnalyze(file: File) {
    setSelectedFile(file);
    const result = await analyzeFoodPhoto(file);
    setAnalysis(result);
  }

  async function handleLog() {
    if (!user?.id || !analysis) {
      return;
    }

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
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SectionLabel>Nutrition Optics</SectionLabel>
        <h2 className="font-display text-4xl text-ivory md:text-5xl">
          Photo intake et journal nutritionnel dans le même cockpit.
        </h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <LabCard className="space-y-5">
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-amber" />
            <div>
              <p className="text-sm text-ivory">Analyse photo</p>
              <p className="text-sm text-mist/60">Envoie une photo de repas pour estimation macros.</p>
            </div>
          </div>

          <label className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-black/20 text-center transition hover:border-white/20">
            <Salad className="h-10 w-10 text-amber" />
            <span className="mt-4 text-lg text-ivory">Dépose une photo de repas</span>
            <span className="mt-2 text-sm text-mist/55">jpg, png, webp</span>
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

          {selectedFile ? (
            <p className="text-sm text-mist/55">Photo sélectionnée: {selectedFile.name}</p>
          ) : null}

          {analysis ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Plat détecté</p>
                <p className="mt-3 text-2xl text-ivory">{analysis.dishName}</p>
                <p className="mt-2 text-sm text-mist/60">{analysis.notes}</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Confiance IA</p>
                <p className="mt-3 text-2xl text-ivory">{analysis.confidencePercent}%</p>
                <p className="mt-2 text-sm text-mist/60">Le journal reste éditable après log.</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm text-mist/60">
                  <Flame className="h-4 w-4 text-amber" />
                  Calories
                </div>
                <p className="mt-3 text-2xl text-ivory">{analysis.estimatedCalories}</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm text-mist/60">
                  <Drumstick className="h-4 w-4 text-amber" />
                  Macros
                </div>
                <p className="mt-3 text-lg text-ivory">
                  P {analysis.proteinG}g · C {analysis.carbsG}g · F {analysis.fatG}g
                </p>
              </div>
            </div>
          ) : null}

          {analysis ? (
            <div className="flex flex-wrap items-center gap-3">
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
          ) : null}
        </LabCard>

        <LabCard className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Journal du jour</p>
            <h3 className="mt-2 text-2xl text-ivory">Totaux</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Calories</p>
              <p className="mt-3 text-2xl text-ivory">{dailyLog?.totals.calories ?? 0}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Macros</p>
              <p className="mt-3 text-sm text-ivory">
                P {dailyLog?.totals.proteinG ?? 0} · C {dailyLog?.totals.carbsG ?? 0} · F {dailyLog?.totals.fatG ?? 0}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {dailyLog?.entries.map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-ivory">{entry.foodName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.28em] text-mist/45">
                  {entry.mealType} · {entry.source}
                </p>
                <p className="mt-2 text-sm text-mist/60">
                  {entry.calories ?? 0} kcal · P {entry.proteinG ?? 0} · C {entry.carbsG ?? 0} · F {entry.fatG ?? 0}
                </p>
              </div>
            ))}

            {!dailyLog?.entries.length ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-mist/55">
                Aucun repas journalisé aujourd’hui.
              </div>
            ) : null}
          </div>
        </LabCard>
      </div>
    </div>
  );
}
