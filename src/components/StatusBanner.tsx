import styled from 'styled-components';

interface StatusBannerProps {
  isRecording: boolean;
  isLoading: boolean;
  isPaused?: boolean;
}

const Banner = styled.div<{ $isRecording: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme, $isRecording }) =>
    $isRecording ? theme.colors.successText : theme.colors.dangerText};
  background: ${({ theme, $isRecording }) =>
    $isRecording ? theme.colors.successSoft : theme.colors.dangerSoft};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.small};
  font-weight: 600;
`;

export function StatusBanner({ isRecording, isLoading, isPaused = false }: StatusBannerProps) {
  const status = isLoading ? 'Carregando...' : isRecording ? isPaused ? 'Pausado' : 'Gravando' : 'Parado';

  return (
    <Banner $isRecording={isRecording} role="status" aria-live="polite">
      Status: {status}
    </Banner>
  );
}
