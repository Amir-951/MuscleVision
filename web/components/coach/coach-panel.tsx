'use client';

import {Bot, RefreshCcw, SendHorizontal} from 'lucide-react';
import {useEffect, useState} from 'react';

import {useAuth} from '@/components/providers/auth-provider';
import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
import {clearCoachHistory, getCoachHistory, getWorkoutHistory, sendCoachMessage} from '@/lib/api';
import type {CoachId, CoachMessage, WorkoutHistoryItem} from '@/lib/types';

const personas: {id: CoachId; name: string; tone: string}[] = [
  {id: 'max', name: 'Max', tone: 'Supportif'},
  {id: 'sergeant', name: 'Sergent', tone: 'Militaire'},
  {id: 'dr_reed', name: 'Dr. Reed', tone: 'Scientifique'},
  {id: 'bro', name: 'Bro', tone: 'Salle'},
];

export function CoachPanel() {
  const {user} = useAuth();
  const [coachId, setCoachId] = useState<CoachId>('dr_reed');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sessions, setSessions] = useState<WorkoutHistoryItem[]>([]);
  const [linkedSessionId, setLinkedSessionId] = useState<string>('');

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void getCoachHistory(coachId, user.id).then(setMessages);
    void getWorkoutHistory(user.id).then((history) => {
      setSessions(history);
      if (!linkedSessionId && history[0]?.id) {
        setLinkedSessionId(history[0].id);
      }
    });
  }, [coachId, linkedSessionId, user?.id]);

  async function handleSend() {
    if (!user?.id || !draft.trim()) {
      return;
    }

    const optimisticMessage: CoachMessage = {role: 'user', content: draft};
    setMessages((current) => [...current, optimisticMessage]);
    const currentDraft = draft;
    setDraft('');

    const reply = await sendCoachMessage({
      coachId,
      userId: user.id,
      message: currentDraft,
      sessionId: linkedSessionId || undefined,
    });

    setMessages((current) => [...current, {role: 'assistant', content: reply.reply}]);
  }

  async function handleClear() {
    if (!user?.id) {
      return;
    }
    await clearCoachHistory(coachId, user.id);
    setMessages([]);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SectionLabel>Coach Console</SectionLabel>
        <h2 className="font-display text-4xl text-ivory md:text-5xl">
          Persona engine branché sur le résumé texte de séance.
        </h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
        <LabCard className="space-y-4">
          <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Persona</p>
          {personas.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => setCoachId(persona.id)}
              className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                coachId === persona.id
                  ? 'border-white/20 bg-white/10'
                  : 'border-white/10 bg-black/20 hover:border-white/15'
              }`}
            >
              <p className="text-lg text-ivory">{persona.name}</p>
              <p className="text-sm text-mist/60">{persona.tone}</p>
            </button>
          ))}

          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Contexte séance</p>
            <select
              value={linkedSessionId}
              onChange={(event) => setLinkedSessionId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-ivory outline-none"
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id} className="bg-graphite">
                  {session.exerciseType ?? 'unknown'} · {session.correctnessScore ?? 0}/100
                </option>
              ))}
            </select>
          </div>
        </LabCard>

        <LabCard className="flex min-h-[680px] flex-col p-0">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Conversation</p>
              <h3 className="mt-1 text-xl text-ivory">{personas.find((persona) => persona.id === coachId)?.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => void handleClear()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-mist/60 transition hover:border-white/20 hover:text-ivory"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-black/20 text-sm text-mist/55">
                Le coach attend ton premier message.
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                className={`max-w-[82%] rounded-[24px] px-5 py-4 text-sm leading-7 ${
                  message.role === 'assistant'
                    ? 'border border-white/10 bg-white/5 text-mist/80'
                    : 'ml-auto bg-[linear-gradient(135deg,rgba(233,75,53,0.28),rgba(255,154,61,0.18))] text-ivory'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-mist/40">
                    <Bot className="h-3.5 w-3.5" />
                    Coach
                  </div>
                ) : null}
                {message.content}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 px-6 py-5">
            <div className="flex gap-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Demande une correction de posture, un plan de progression, ou une lecture de la séance liée."
                className="min-h-[110px] flex-1 rounded-[26px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none placeholder:text-mist/35"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                className="inline-flex h-fit items-center gap-2 rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-5 py-3 text-sm font-medium text-white"
              >
                <SendHorizontal className="h-4 w-4" />
                Envoyer
              </button>
            </div>
          </div>
        </LabCard>
      </div>
    </div>
  );
}
