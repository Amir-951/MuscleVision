'use client';

import {useState} from 'react';

import {useAuth} from '@/components/providers/auth-provider';
import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
import {getSupabaseBrowserClient} from '@/lib/supabase';

export default function ProfilePage() {
  const {user, refreshProfile} = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [goal, setGoal] = useState(user?.goal ?? 'general');
  const [heightCm, setHeightCm] = useState(user?.heightCm ? String(user.heightCm) : '');
  const [weightKg, setWeightKg] = useState(user?.weightKg ? String(user.weightKg) : '');

  async function saveProfile() {
    if (!user?.id) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    await supabase.from('users').upsert({
      id: user.id,
      display_name: displayName,
      goal,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
    });
    await refreshProfile();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SectionLabel>Profile</SectionLabel>
        <h2 className="font-display text-4xl text-ivory md:text-5xl">
          Ajuste tes paramètres athlète.
        </h2>
      </div>

      <LabCard className="max-w-3xl space-y-4">
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Nom affiché"
          className="w-full rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none"
        />
        <select
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          className="w-full rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none"
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
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={heightCm}
            onChange={(event) => setHeightCm(event.target.value)}
            placeholder="Taille (cm)"
            className="w-full rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none"
          />
          <input
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
            placeholder="Poids (kg)"
            className="w-full rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void saveProfile()}
          className="rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-5 py-3 text-sm font-medium text-white"
        >
          Sauvegarder
        </button>
      </LabCard>
    </div>
  );
}
