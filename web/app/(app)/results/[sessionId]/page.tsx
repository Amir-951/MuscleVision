import {WorkoutResultView} from '@/components/workouts/workout-result-view';

export default async function ResultPage({
  params,
}: {
  params: Promise<{sessionId: string}>;
}) {
  const {sessionId} = await params;
  return <WorkoutResultView sessionId={sessionId} />;
}
