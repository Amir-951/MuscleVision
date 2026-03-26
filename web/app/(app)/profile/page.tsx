'use client';

import {useState} from 'react';

import {SectionLabel} from '@/components/shared/section-label';
import {useAuth} from '@/components/providers/auth-provider';
import {getSupabaseBrowserClient} from '@/lib/supabase';

export default function ProfilePage() {
  const {user, refreshProfile} = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [goal, setGoal] = useState(user?.goal ?? 'general');
  const [heightCm, setHeightCm] = useState(user?.heightCm ? String(user.heightCm) : '');
  const [weightKg, setWeightKg] = useState(user?.weightKg ? String(user.weightKg) : '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function saveProfile() {
    if (!user?.id) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const supabase = getSupabaseBrowserClient();
      const {error: upsertError} = await supabase.from('users').upsert({
        id: user.id,
        display_name: displayName,
        goal,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
      });

      if (upsertError) {
        throw upsertError;
      }

      await refreshProfile();
      setSuccess('Profil sauvegardé.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Sauvegarde impossible.');
    }
  }

  const summary = [
    {label: 'Nom', value: displayName || 'Athlete'},
    {label: 'Objectif', value: goal},
    {label: 'Taille', value: heightCm ? `${heightCm} cm` : '—'},
    {label: 'Poids', value: weightKg ? `${weightKg} kg` : '—'},
  ];

  return (
    <div className="grid gap-12 xl:grid-cols-[minmax(0,1.18fr)_320px]">
      <section className="space-y-8">
        <div className="space-y-4 border-b border-white/10 pb-8">
          <SectionLabel>Athlete sheet</SectionLabel>
          <h1 className="max-w-[10ch] font-display text-[3.4rem] leading-[0.88] text-ivory md:text-[4.8rem]">
            Fiche athlète.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-mist/62">
            Peu de champs, une lecture claire, une identité plus proche d’un dossier athlétique que d’un formulaire standard.
          </p>
        </div>

        <div className="space-y-5">
          {error ? <p className="text-sm text-[#ff8d8d]">{error}</p> : null}
          {success ? <p className="text-sm text-[#b6f7b0]">{success}</p> : null}

          <div className="space-y-5 border-b border-white/10 pb-5">
            <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Identité</p>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Nom affiché"
              className="w-full border-b border-white/10 bg-transparent px-0 py-4 text-2xl text-ivory outline-none placeholder:text-mist/28"
            />
          </div>

          <div className="grid gap-5 border-b border-white/10 pb-5 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Objectif</p>
              <select
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="w-full border-b border-white/10 bg-transparent px-0 py-4 text-lg text-ivory outline-none"
              >
                <option value="general" className="bg-graphite">
                  General
                </option>
                <option value="muscle_gain" className="bg-graphite">
                  Muscle gain
                </option>
                <option value="fat_loss" className="bg-graphite">
                  Fat loss
                </option>
                <option value="endurance" className="bg-graphite">
                  Endurance
                </option>
              </select>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Mensurations</p>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={heightCm}
                  onChange={(event) => setHeightCm(event.target.value)}
                  placeholder="Taille"
                  className="w-full border-b border-white/10 bg-transparent px-0 py-4 text-lg text-ivory outline-none placeholder:text-mist/28"
                />
                <input
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  placeholder="Poids"
                  className="w-full border-b border-white/10 bg-transparent px-0 py-4 text-lg text-ivory outline-none placeholder:text-mist/28"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-8 border-t border-white/10 pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Current readout</p>
          <div className="space-y-4">
            {summary.map((item) => (
              <div key={item.label} className="border-b border-white/10 pb-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-mist/34">{item.label}</p>
                <p className="mt-2 text-lg text-ivory">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 border-t border-white/10 pt-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Action</p>
          <button
            type="button"
            onClick={() => void saveProfile()}
            className="rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-5 py-3 text-sm font-medium text-white"
          >
            Sauvegarder
          </button>
          <p className="text-sm leading-7 text-mist/56">
            Le profil doit rester court et opérable. Ce panneau ne sert qu’à fixer l’identité et l’objectif actif.
          </p>
        </div>
      </aside>
    </div>
  );
}
