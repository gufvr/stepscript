import { useCallback, useEffect, useState } from 'react';
import { loadRecordingState } from '../services/recordingStorage';
import {
  startRecordingSession,
  stopRecordingSession,
} from '../services/recordingSession';

export function useRecordingState() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    loadRecordingState().then((state) => {
      if (isMounted) {
        setIsRecording(state.isRecording);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleRecording = useCallback(async (guided = false) => {
    setError(undefined);
    setIsTransitioning(true);

    try {
      const nextState = isRecording
        ? await stopRecordingSession()
        : await startRecordingSession(guided);
      setIsRecording(nextState.isRecording);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível alterar a gravação.',
      );
    } finally {
      setIsTransitioning(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    isLoading: isLoading || isTransitioning,
    error,
    toggleRecording,
  };
}
