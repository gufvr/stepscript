import styled from 'styled-components';
import { AppFooter } from './components/AppFooter';
import { BrandHeader } from './components/BrandHeader';
import { RecordedStepsList } from './components/RecordedStepsList';
import {
  PrivacyNotice,
  RECORDING_PRIVACY_NOTICE_ID,
} from './components/PrivacyNotice';
import { RecordingButton } from './components/RecordingButton';
import { ReplayControls } from './components/ReplayControls';
import { StatusBanner } from './components/StatusBanner';
import { useRecordingState } from './hooks/useRecordingState';
import { useRecordedSteps } from './hooks/useRecordedSteps';
import { useElementVisibilityPicker } from './hooks/useElementVisibilityPicker';
import { closeSidePanel } from './services/closeSidePanel';

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background};
`;

const Content = styled.main`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const RecordingCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const StepCount = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.small};
  text-align: center;
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.dangerText};
  font-size: ${({ theme }) => theme.fontSizes.small};
  line-height: 1.4;
  text-align: center;
`;

export function App() {
  const { isRecording, isLoading, error, toggleRecording } =
    useRecordingState();
  const {
    steps,
    isLoading: areStepsLoading,
    pendingMutation,
    feedback: stepsFeedback,
    addUrlAssertion,
    removeStep,
    editStepDescription,
    moveStep,
    clearSteps,
  } = useRecordedSteps();
  const elementPicker = useElementVisibilityPicker();
  const stepCountLabel =
    steps.length === 1 ? '1 passo capturado' : `${steps.length} passos capturados`;

  return (
    <Panel>
      <BrandHeader onClose={closeSidePanel} />
      <Content>
        <RecordingCard aria-label="Controle de gravação">
          <StatusBanner isRecording={isRecording} isLoading={isLoading} />
          <StepCount>{stepCountLabel}</StepCount>
          {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
          <PrivacyNotice />
          <RecordingButton
            isRecording={isRecording}
            isLoading={isLoading}
            onClick={toggleRecording}
            describedBy={RECORDING_PRIVACY_NOTICE_ID}
          />
        </RecordingCard>
        <ReplayControls stepCount={steps.length} isRecording={isRecording} />
        <RecordedStepsList
          steps={steps}
          isRecording={isRecording}
          isLoading={areStepsLoading}
          pendingMutation={pendingMutation}
          feedback={stepsFeedback}
          isElementPickerActive={elementPicker.isActive}
          elementPickerMode={elementPicker.mode}
          isElementPickerPending={elementPicker.isPending}
          elementPickerFeedback={elementPicker.feedback}
          onStartElementPicker={elementPicker.start}
          onStartElementTextPicker={elementPicker.startText}
          onCancelElementPicker={elementPicker.cancel}
          onAddUrlAssertion={addUrlAssertion}
          onDeleteStep={removeStep}
          onEditStep={editStepDescription}
          onMoveStep={moveStep}
          onClearSteps={clearSteps}
        />
      </Content>
      <AppFooter />
    </Panel>
  );
}
