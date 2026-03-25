'use client';

import {Camera, Square, Video} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import {LabCard} from '@/components/shared/lab-card';

export function WebcamRecorder({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Prêt à capturer une séquence courte.');
  const [error, setError] = useState<string | null>(null);

  async function startRecording() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm',
      });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {type: 'video/webm'});
        const file = new File([blob], `capture-${Date.now()}.webm`, {
          type: 'video/webm',
        });
        onCapture(file);
        setStatus('Capture prête. Tu peux lancer l’analyse.');

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
      setStatus('Enregistrement en cours. Garde le corps entier dans le cadre.');
    } catch (startError) {
      setIsRecording(false);
      setError(
        startError instanceof Error
          ? startError.message
          : 'Impossible d’accéder à la webcam.',
      );
      setStatus('Autorise la webcam puis réessaie.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <LabCard className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-mist/45">Capture direct</p>
          <h3 className="mt-2 text-xl text-ivory">Webcam biomechanics intake</h3>
        </div>
        <Camera className="h-5 w-5 text-amber" />
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
        <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
      </div>

      <p className="text-sm text-mist/65">{status}</p>
      {error ? <p className="text-sm text-[#ff8d8d]">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#e94b35,#ff9a3d)] px-5 py-3 text-sm font-medium text-white"
          >
            <Video className="h-4 w-4" />
            Démarrer
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-ivory"
          >
            <Square className="h-4 w-4" />
            Arrêter
          </button>
        )}
      </div>
    </LabCard>
  );
}
