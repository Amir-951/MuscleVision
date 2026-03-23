'use client';

import {getSupabaseBrowserClient} from '@/lib/supabase';
import type {
  CoachId,
  CoachMessage,
  NutritionAnalysisResult,
  TodayLogResponse,
  WorkoutHistoryItem,
  WorkoutJobStatus,
  WorkoutResult,
} from '@/lib/types';
import {config} from '@/lib/config';

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: {session},
  } = await supabase.auth.getSession();

  return session?.access_token
    ? {Authorization: `Bearer ${session.access_token}`}
    : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const requestHeaders = new Headers(init?.headers);

  if (!(init?.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  Object.entries(headers).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API error ${response.status}`);
  }

  return response.json();
}

export async function uploadWorkoutFile(params: {
  userId: string;
  source: 'upload' | 'webcam';
  file: File;
}) {
  const form = new FormData();
  form.append('user_id', params.userId);
  form.append('source', params.source);
  form.append('video_format', params.file.type || 'video/webm');
  form.append('file', params.file);

  return request<{job_id: string; session_id: string; video_url?: string}>(
    '/workouts/upload-file',
    {
      method: 'POST',
      body: form,
    },
  );
}

export async function getJobStatus(jobId: string): Promise<WorkoutJobStatus> {
  const data = await request<{status: WorkoutJobStatus['status']; progress: number; message: string}>(
    `/workouts/jobs/${jobId}`,
  );

  return data;
}

export async function getWorkoutResult(sessionId: string): Promise<WorkoutResult> {
  const data = await request<any>(`/workouts/results/${sessionId}`);
  return {
    sessionId: data.session_id,
    source: data.source,
    videoUrl: data.video_url,
    exerciseType: data.exercise_type,
    correctnessScore: data.correctness_score,
    durationSeconds: data.duration_seconds,
    analysisText: data.analysis_text,
    analysisArtifactUrl: data.analysis_artifact_url,
    keypointsArtifactUrl: data.keypoints_artifact_url,
    repCount: data.rep_count,
    tempo: data.tempo,
    symmetryScore: data.symmetry_score,
    stabilityScore: data.stability_score,
    feedback: data.feedback,
    muscleEngagement: data.muscle_engagement,
  };
}

export async function getWorkoutHistory(userId: string): Promise<WorkoutHistoryItem[]> {
  const data = await request<{sessions: any[]}>(`/workouts/history?user_id=${userId}`);
  return data.sessions.map((session) => ({
    id: session.id,
    source: session.source ?? 'upload',
    exerciseType: session.exercise_type,
    correctnessScore: session.correctness_score,
    durationSeconds: session.duration_seconds,
    createdAt: session.created_at,
    status: session.status,
    repCount: session.rep_count,
    symmetryScore: session.symmetry_score,
    stabilityScore: session.stability_score,
    feedback: session.feedback,
  }));
}

export async function sendCoachMessage(params: {
  coachId: CoachId;
  userId: string;
  message: string;
  sessionId?: string;
}) {
  return request<{reply: string; coach_id: CoachId}>('/coach/message', {
    method: 'POST',
    body: JSON.stringify({
      coach_id: params.coachId,
      user_id: params.userId,
      message: params.message,
      session_id: params.sessionId,
    }),
  });
}

export async function getCoachHistory(coachId: CoachId, userId: string): Promise<CoachMessage[]> {
  const data = await request<{messages: any[]}>(
    `/coach/history/${coachId}?user_id=${userId}`,
  );
  return data.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
  }));
}

export async function clearCoachHistory(coachId: CoachId, userId: string) {
  return request<{success: boolean}>(`/coach/history/${coachId}?user_id=${userId}`, {
    method: 'DELETE',
  });
}

export async function analyzeFoodPhoto(file: File): Promise<NutritionAnalysisResult> {
  const form = new FormData();
  form.append('file', file);
  const data = await request<any>('/nutrition/analyze-photo-file', {
    method: 'POST',
    body: form,
  });

  return {
    dishName: data.dish_name,
    estimatedCalories: data.estimated_calories,
    proteinG: data.protein_g,
    carbsG: data.carbs_g,
    fatG: data.fat_g,
    confidencePercent: data.confidence_percent,
    notes: data.notes,
  };
}

export async function logFood(params: {
  userId: string;
  mealType: string;
  foodName: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  source: string;
}) {
  return request('/nutrition/log', {
    method: 'POST',
    body: JSON.stringify({
      user_id: params.userId,
      meal_type: params.mealType,
      food_name: params.foodName,
      calories: params.calories,
      protein_g: params.proteinG,
      carbs_g: params.carbsG,
      fat_g: params.fatG,
      source: params.source,
    }),
  });
}

export async function getTodayNutritionLog(userId: string): Promise<TodayLogResponse> {
  const data = await request<any>(`/nutrition/log/today?user_id=${userId}`);
  return {
    entries: data.entries.map((entry: any) => ({
      id: entry.id,
      mealType: entry.meal_type,
      foodName: entry.food_name,
      photoUrl: entry.photo_url,
      calories: entry.calories,
      proteinG: entry.protein_g,
      carbsG: entry.carbs_g,
      fatG: entry.fat_g,
      loggedAt: entry.logged_at,
      source: entry.source,
    })),
    totals: {
      calories: data.totals.calories,
      proteinG: data.totals.protein_g,
      carbsG: data.totals.carbs_g,
      fatG: data.totals.fat_g,
    },
  };
}
