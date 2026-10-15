import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runSsoAutomation } from '../../automation/ssoAutomation';
import { validateActiveTabContext } from '../../services/activeTabContext';
import { getReplayStatus } from '../../replay/replaySession';

vi.mock('../../services/activeTabContext', () => ({ validateActiveTabContext: vi.fn() }));
vi.mock('../../replay/replaySession', () => ({ getReplayStatus: vi.fn() }));

const url = 'https://app.example.test/login';
const option = { fingerprint: 'reviewed', provider: 'Google', actionLabel: 'Continue with Google',
  destination: 'https://accounts.google.com/o/oauth2/v2/auth', actionSelector: 'a#sso', actionTagName: 'a', canStart: true };
const request = { kind: 'start' as const, fingerprint: option.fingerprint, destination: option.destination, documentId: 'document-1' };

describe('SSO start boundaries', () => {
  let recording = false;
  let executeScript: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    recording = false;
    vi.mocked(validateActiveTabContext).mockReset().mockResolvedValue({ tabId: 3, windowId: 1, url });
    vi.mocked(getReplayStatus).mockReturnValue({ success: true, replayStatus: { phase: 'idle', steps: [] } });
    executeScript = vi.fn(async ({ args }: { args: string[] }) => args[0] === 'inspect'
      ? [{ result: { success: true, ssoOptions: [option] } }]
      : [{ result: { success: true, automationSteps: ['Clique confirmado'] } }]);
    vi.stubGlobal('chrome', {
      permissions: { contains: vi.fn(async () => true) },
      storage: { local: { get: vi.fn(async () => ({ recordingState: { isRecording: recording } })) } },
      webNavigation: { getFrame: vi.fn(async () => ({ url, documentId: 'document-1', documentLifecycle: 'active' })) },
      scripting: { executeScript },
    });
  });

  it('aborts without a click when recording starts after inspection', async () => {
    executeScript.mockImplementation(async ({ args }: { args: string[] }) => {
      if (args[0] === 'inspect') { recording = true; return [{ result: { success: true, ssoOptions: [option] } }]; }
      throw new Error('The click must not run');
    });
    const save = vi.fn();
    const result = await runSsoAutomation(request, save);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/gravação começou/);
    expect(executeScript).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not record when the page rejects the final action', async () => {
    executeScript.mockImplementation(async ({ args }: { args: string[] }) => args[0] === 'inspect'
      ? [{ result: { success: true, ssoOptions: [option] } }]
      : [{ result: { success: false, error: 'Action changed' } }]);
    const save = vi.fn();
    expect((await runSsoAutomation(request, save)).success).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not record an unconfirmed click after navigation interrupts injection', async () => {
    executeScript.mockImplementation(async ({ args }: { args: string[] }) => {
      if (args[0] === 'inspect') return [{ result: { success: true, ssoOptions: [option] } }];
      throw new Error('Frame removed during navigation');
    });
    const save = vi.fn();
    expect((await runSsoAutomation(request, save)).error).toMatch(/confirmar o clique/);
    expect(save).not.toHaveBeenCalled();
  });

  it('records only after the final click returns success', async () => {
    const save = vi.fn(async () => undefined);
    expect((await runSsoAutomation(request, save)).success).toBe(true);
    expect(save).toHaveBeenCalledOnce();
    expect(executeScript.mock.invocationCallOrder[1]).toBeLessThan(save.mock.invocationCallOrder[0]);
  });
});
