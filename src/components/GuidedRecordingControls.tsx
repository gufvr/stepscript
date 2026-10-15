import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { GuidedRecordingStatus } from '../guided/guidedRecording';
import type { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import type { RecordedStep } from '../shared/recordingTypes';
import { resolveStepDescription } from '../shared/descriptions/resolveStepDescription';

const Card = styled.section`
  display: flex; flex-direction: column; gap: 10px; padding: 16px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.small};
  overflow-wrap: anywhere;
`;
const Actions = styled.div`display: flex; flex-wrap: wrap; gap: 8px;`;
const Button = styled.button`
  padding: 8px 12px; font: inherit; border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border}; cursor: pointer;
  &:disabled { opacity: .55; cursor: not-allowed; }
  &:focus-visible { outline: 3px solid ${({ theme }) => theme.colors.focus}; }
`;

async function request(message: ExtensionMessage) {
  return await chrome.runtime.sendMessage(message) as ExtensionResponse;
}

export function GuidedRecordingControls({ steps, isRecording, busy, onStop, onPauseChange }: {
  steps: RecordedStep[]; isRecording: boolean; busy: boolean; onStop: () => void;
  onPauseChange?: (paused: boolean) => void;
}) {
  const [status, setStatus] = useState<GuidedRecordingStatus>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const mounted = useRef(false);
  const operation = useRef(false);
  useEffect(() => { onPauseChange?.(status?.phase === 'paused'); }, [status?.phase, onPauseChange]);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const poll = async () => {
      if (!globalThis.chrome?.runtime?.sendMessage || operation.current) return;
      try {
        const result = await request({ type: 'GET_GUIDED_RECORDING_STATUS' });
        if (!cancelled && !operation.current && result?.guidedStatus) setStatus(result.guidedStatus);
      } catch { /* Normal recording remains usable if the worker is unavailable. */ }
    };
    void poll();
    const timer = setInterval(() => void poll(), 600);
    return () => { cancelled = true; mounted.current = false; clearInterval(timer); };
  }, []);
  const control = async (action: 'pause' | 'resume' | 'review', stepId?: string) => {
    if (operation.current) return;
    operation.current = true; setPending(true); setError(undefined);
    try {
      const result = await request({ type: 'CONTROL_GUIDED_RECORDING', payload: { action, stepId } });
      if (!result.success) throw new Error(result.error ?? 'Não foi possível atualizar a gravação guiada.');
      if (mounted.current) setStatus(result.guidedStatus);
    } catch (caught) {
      if (mounted.current) setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar a gravação guiada.');
    } finally {
      operation.current = false;
      if (mounted.current) setPending(false);
    }
  };
  if (!status || status.phase === 'idle') return null;
  const selected = steps.findIndex((step) => 'id' in step && step.id === status.selectedStepId);
  const index = status.phase === 'recording' ? steps.length - 1 : selected >= 0 ? selected : steps.length - 1;
  const current = steps[index];
  const disabled = pending || busy;
  const review = (position: number) => {
    const step = steps[position];
    void control('review', step && 'id' in step ? step.id : undefined);
  };
  return <Card aria-label="Gravação guiada">
    <h2>Gravação guiada</h2>
    <p role="status" aria-live="polite">{status.phase === 'paused' ? 'Captura pausada. ' : ''}{status.message}</p>
    <div aria-live="polite" aria-atomic="true">
      {current ? <><p>Passo {index + 1} de {steps.length}</p><p>{resolveStepDescription(current).text}</p></>
        : <p>Aguardando a primeira ação na página.</p>}
    </div>
    {error && <p role="alert">{error}</p>}
    <Actions>
      {isRecording && <Button disabled={disabled} onClick={() => void control(status.phase === 'paused' ? 'resume' : 'pause')}>
        {status.phase === 'paused' ? 'Retomar gravação' : 'Pausar gravação'}</Button>}
      <Button disabled={disabled || !steps.length} onClick={() => review(0)}>Revisar passos</Button>
      <Button disabled={disabled || index <= 0} onClick={() => review(index - 1)}>Passo anterior</Button>
      <Button disabled={disabled || index < 0 || index >= steps.length - 1} onClick={() => review(index + 1)}>Avançar passo</Button>
      {isRecording && <Button disabled={disabled} onClick={onStop}>Encerrar gravação</Button>}
    </Actions>
    <p>O destaque acompanha suas ações. A revisão apenas destaca elementos disponíveis na página atual.</p>
  </Card>;
}
