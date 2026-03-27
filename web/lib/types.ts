export type CoachId = 'max' | 'sergeant' | 'dr_reed' | 'bro';

export type WorkoutJobState = 'pending' | 'processing' | 'done' | 'error';

export type MuscleEngagement = Partial<Record<string, number>>;

export interface PoseKeypoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface WorkoutPoseFrame {
  timestamp: number;
  keypoints: Record<string, PoseKeypoint>;
  metrics?: Record<string, number>;
}

export interface WorkoutKeypointsArtifact {
  sessionId: string;
  frames: WorkoutPoseFrame[];
}

export interface AppUser {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  goal?: string | null;
}

export interface WorkoutJobStatus {
  status: WorkoutJobState;
  progress: number;
  message: string;
}

export interface WorkoutHistoryItem {
  id: string;
  source: 'upload' | 'webcam';
  exerciseType?: string | null;
  correctnessScore?: number | null;
  durationSeconds?: number | null;
  createdAt: string;
  status: WorkoutJobState;
  repCount?: number | null;
  symmetryScore?: number | null;
  stabilityScore?: number | null;
  feedback?: string | null;
}

export interface WorkoutResult {
  sessionId: string;
  source: 'upload' | 'webcam';
  videoUrl?: string | null;
  exerciseType: string;
  correctnessScore: number;
  durationSeconds?: number | null;
  analysisText?: string | null;
  analysisArtifactUrl?: string | null;
  keypointsArtifactUrl?: string | null;
  repCount: number;
  tempo: string;
  symmetryScore: number;
  stabilityScore: number;
  feedback?: string | null;
  muscleEngagement: MuscleEngagement;
}

export interface CoachMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface NutritionAnalysisResult {
  dishName: string;
  estimatedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidencePercent: number;
  notes: string;
}

export interface FoodLogEntry {
  id: string;
  mealType: string;
  foodName: string;
  photoUrl?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  loggedAt: string;
  source: string;
}

export interface TodayLogResponse {
  entries: FoodLogEntry[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
}
