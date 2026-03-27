'use client';

import {Camera, Square, Video} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

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
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1.18fr)_320px]">
      <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_22%_18%,rgba(137,209,255,0.16),transparent_24%),linear-gradient(180deg,#10141a_0%,#090b0f_100%)]">
        <div className="absolute inset-0 lab-grid opacity-55" />
        <video
          ref={videoRef}
          muted
          playsInline
          className="relative aspect-video w-full min-h-[560px] object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(7,8,11,0.82))] p-8">
          <p className="text-[11px] uppercase tracking-[0.34em] text-mist/45">Live capture</p>
          <h3 className="mt-3 font-display text-[2.6rem] leading-[0.9] text-ivory md:text-[3.4rem]">
            Cadre le corps. Lance. Coupe.
          </h3>
          <p className="mt-3 max-w-xl text-base text-mist/62">Séquence courte. Corps visible.</p>
        </div>
      </div>

      <aside className="space-y-8 border-t border-white/10 pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-amber" />
            <div>
              <p className="text-sm text-ivory">Webcam biomechanics intake</p>
              <p className="text-sm text-mist/55">{status}</p>
            </div>
          </div>

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
        </div>

        <div className="space-y-4 border-t border-white/10 pt-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-mist/38">Capture notes</p>
          <p className="text-sm text-mist/58">Plein corps. Lumière stable. Fond calme.</p>
        </div>
      </aside>
    </div>
  );
}
