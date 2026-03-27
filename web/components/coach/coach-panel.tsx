'use client';

import {Bot, RefreshCcw, SendHorizontal, Sparkles} from 'lucide-react';
import {useEffect, useState} from 'react';

import {CoachAvatarScene} from '@/components/coach/coach-avatar-scene';
import {CoachLiveSession} from '@/components/coach/coach-live-session';
import {coachPersonaList, coachPersonaMap} from '@/components/coach/coach-personas';
import {useAuth} from '@/components/providers/auth-provider';
import {LabCard} from '@/components/shared/lab-card';
import {SectionLabel} from '@/components/shared/section-label';
import {clearCoachHistory, getCoachHistory, getWorkoutHistory, sendCoachMessage} from '@/lib/api';
import {formatScore10From100} from '@/lib/score';
import type {CoachId, CoachMessage, WorkoutHistoryItem} from '@/lib/types';

export function CoachPanel() {
  const {user} = useAuth();
  const [coachId, setCoachId] = useState<CoachId>('dr_reed');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sessions, setSessions] = useState<WorkoutHistoryItem[]>([]);
  const [linkedSessionId, setLinkedSessionId] = useState<string>('');
  const [workspaceMode, setWorkspaceMode] = useState<'live' | 'chat'>('live');
  const [error, setError] = useState<string | null>(null);
  const currentPersona = coachPersonaMap[coachId];

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void getCoachHistory(coachId, user.id)
      .then((history) => {
        setMessages(history);
        setError(null);
      })
      .catch((loadError) => {
        setMessages([]);
        setError(loadError instanceof Error ? loadError.message : 'Chargement coach impossible.');
      });
    void getWorkoutHistory(user.id)
      .then((history) => {
        setSessions(history);
        if (!linkedSessionId && history[0]?.id) {
          setLinkedSessionId(history[0].id);
        }
        setError(null);
      })
      .catch((loadError) => {
        setSessions([]);
        setError(loadError instanceof Error ? loadError.message : 'Chargement des séances impossible.');
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

    try {
      setError(null);
      const reply = await sendCoachMessage({
        coachId,
        userId: user.id,
        message: currentDraft,
        sessionId: linkedSessionId || undefined,
      });

      setMessages((current) => [...current, {role: 'assistant', content: reply.reply}]);
    } catch (sendError) {
      setMessages((current) => current.slice(0, -1));
      setDraft(currentDraft);
      setError(sendError instanceof Error ? sendError.message : 'Envoi impossible.');
    }
  }

  async function handleClear() {
    if (!user?.id) {
      return;
    }
    try {
      setError(null);
      await clearCoachHistory(coachId, user.id);
      setMessages([]);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Réinitialisation impossible.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SectionLabel>Coach Console</SectionLabel>
        <h2 className="font-display text-4xl text-ivory md:text-5xl">Choisis un coach.</h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
        <LabCard className="space-y-4">
          <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Persona</p>
          {coachPersonaList.map((persona) => (
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
              <div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
                <CoachAvatarScene persona={persona} compact className="h-28" />
                <div className="space-y-2">
                  <div>
                    <p className="text-lg text-ivory">{persona.name}</p>
                    <p className="text-sm text-mist/60">{persona.tone} · {persona.role}</p>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-mist/38">{persona.environment}</p>
                  <p className="text-sm text-mist/68">{persona.signal}</p>
                </div>
              </div>
            </button>
          ))}

          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Contexte séance</p>
            {error ? <p className="mt-3 text-sm text-[#ff8d8d]">{error}</p> : null}
            <select
              value={linkedSessionId}
              onChange={(event) => setLinkedSessionId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-ivory outline-none"
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id} className="bg-graphite">
                  {session.exerciseType ?? 'unknown'} · {formatScore10From100(session.correctnessScore)}
                </option>
              ))}
            </select>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-mist/45">Lecture active</p>
              <p className="mt-2 text-sm text-mist/74">{currentPersona.intro}</p>
            </div>
          </div>
        </LabCard>

        <LabCard className="flex min-h-[680px] flex-col p-0">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-mist/45">Workspace</p>
              <h3 className="mt-1 text-xl text-ivory">{currentPersona.name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWorkspaceMode('live')}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] transition ${
                  workspaceMode === 'live'
                    ? 'bg-white/12 text-ivory'
                    : 'border border-white/10 text-mist/60 hover:border-white/20 hover:text-ivory'
                }`}
              >
                Appel live
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceMode('chat')}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] transition ${
                  workspaceMode === 'chat'
                    ? 'bg-white/12 text-ivory'
                    : 'border border-white/10 text-mist/60 hover:border-white/20 hover:text-ivory'
                }`}
              >
                Chat
              </button>
              {workspaceMode === 'chat' ? (
                <button
                  type="button"
                  onClick={() => void handleClear()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-mist/60 transition hover:border-white/20 hover:text-ivory"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </button>
              ) : null}
            </div>
          </div>

          <div className="border-b border-white/10 p-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-mist/45">{currentPersona.role}</p>
                  <h3 className="max-w-[11ch] font-display text-5xl leading-[0.92] text-ivory md:text-6xl">
                    {currentPersona.name}
                  </h3>
                </div>

                <div className="max-w-xl space-y-3">
                  <p className="text-base text-mist/78">{currentPersona.environmentNote}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-mist/55">
                    {currentPersona.environment}
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-mist/55">
                    {currentPersona.tone}
                  </div>
                  {linkedSessionId ? (
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-mist/55">
                      Session liée
                    </div>
                  ) : null}
                </div>
              </div>

              <CoachAvatarScene persona={currentPersona} showMeta />
            </div>
          </div>

          {workspaceMode === 'live' ? (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <CoachLiveSession coachId={coachId} persona={currentPersona} userId={user?.id} />
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-black/20 text-sm text-mist/55">
                    <div className="max-w-md space-y-3 text-center">
                      <p className="text-[10px] uppercase tracking-[0.32em] text-mist/40">{currentPersona.environment}</p>
                      <p className="text-base text-mist/72">{currentPersona.intro}</p>
                    </div>
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
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border"
                          style={{
                            borderColor: `${currentPersona.palette.edge}50`,
                            background: `linear-gradient(135deg, ${currentPersona.palette.accent}44, ${currentPersona.palette.glow}22)`,
                          }}
                        >
                          <Bot className="h-3.5 w-3.5" />
                        </span>
                        {currentPersona.name}
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
                    placeholder="Demande une correction ou un plan."
                    className="min-h-[110px] flex-1 rounded-[26px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-ivory outline-none placeholder:text-mist/35"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    className="inline-flex h-fit items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white"
                    style={{
                      background: `linear-gradient(135deg, ${currentPersona.palette.accent}, ${currentPersona.palette.glow})`,
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    <SendHorizontal className="h-4 w-4" />
                    Envoyer
                  </button>
                </div>
              </div>
            </>
          )}
        </LabCard>
      </div>
    </div>
  );
}
