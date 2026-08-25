import { describe, it, expect, vi } from 'vitest';
import {
  ensureSandbox,
  execCommand,
  spawnProcess,
  getProcessStatus,
  killProcess,
  writeFile,
  readFile,
  exposePort,
  unexposePort,
  getExposedPorts,
  stopSandbox,
  destroySandbox,
  DEFAULT_WORKING_DIRECTORY,
  type SandboxLike,
} from '../handlers';

function makeSandbox(overrides: Partial<SandboxLike> = {}): SandboxLike {
  return {
    exec: vi.fn().mockResolvedValue({
      success: true,
      exitCode: 0,
      stdout: 'out',
      stderr: '',
      command: 'echo',
      duration: 5,
    }),
    startProcess: vi.fn().mockResolvedValue({ id: 'proc_1', pid: 42 }),
    streamProcessLogs: vi.fn().mockResolvedValue(new ReadableStream()),
    getProcess: vi
      .fn()
      .mockResolvedValue({ id: 'proc_1', status: 'running', exitCode: undefined }),
    killProcess: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
    readFile: vi.fn().mockResolvedValue({ success: true, content: 'hello' }),
    exposePort: vi
      .fn()
      .mockResolvedValue({ url: 'https://4000-x.example.com', port: 4000, name: undefined }),
    unexposePort: vi.fn().mockResolvedValue(undefined),
    getExposedPorts: vi
      .fn()
      .mockResolvedValue([{ url: 'https://4000-x.example.com', port: 4000, status: 'active' }]),
    stop: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('control-plane handlers', () => {
  it('ensureSandbox execs pwd and reports name as id + live workdir', async () => {
    const sandbox = makeSandbox({
      exec: vi.fn().mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: '/workspace\n',
        stderr: '',
        command: 'pwd',
        duration: 1,
      }),
    });
    const result = await ensureSandbox(sandbox, 'conv_abc');
    expect(sandbox.exec).toHaveBeenCalledWith('pwd');
    expect(result).toEqual({
      id: 'conv_abc',
      defaultWorkingDirectory: '/workspace',
      ports: [],
    });
  });

  it('ensureSandbox falls back to the default workdir when pwd is empty', async () => {
    const sandbox = makeSandbox({
      exec: vi.fn().mockResolvedValue({
        success: true, exitCode: 0, stdout: '', stderr: '', command: 'pwd', duration: 1,
      }),
    });
    const result = await ensureSandbox(sandbox, 'c');
    expect(result.defaultWorkingDirectory).toBe(DEFAULT_WORKING_DIRECTORY);
  });

  it('execCommand forwards options and returns the ExecResult subset', async () => {
    const sandbox = makeSandbox();
    const result = await execCommand(sandbox, {
      command: 'ls',
      cwd: '/workspace/repo',
      env: { FOO: 'bar' },
      timeout: 1000,
    });
    expect(sandbox.exec).toHaveBeenCalledWith('ls', {
      cwd: '/workspace/repo',
      env: { FOO: 'bar' },
      timeout: 1000,
    });
    expect(result).toMatchObject({ success: true, exitCode: 0, stdout: 'out' });
    // Only the wire subset is returned — no timestamp/sessionId leak.
    expect(result).not.toHaveProperty('timestamp');
  });

  it('spawnProcess returns processId + pid', async () => {
    const sandbox = makeSandbox();
    const result = await spawnProcess(sandbox, { command: 'node server.js' });
    expect(result).toEqual({ processId: 'proc_1', pid: 42 });
  });

  it('getProcessStatus reports running status and null exit code', async () => {
    const sandbox = makeSandbox();
    const result = await getProcessStatus(sandbox, 'proc_1');
    expect(result).toEqual({ status: 'running', exitCode: null, found: true });
  });

  it('getProcessStatus maps a completed process exit code', async () => {
    const sandbox = makeSandbox({
      getProcess: vi
        .fn()
        .mockResolvedValue({ id: 'proc_1', status: 'completed', exitCode: 0 }),
    });
    expect(await getProcessStatus(sandbox, 'proc_1')).toEqual({
      status: 'completed',
      exitCode: 0,
      found: true,
    });
  });

  it('getProcessStatus reports found:false for an unknown process', async () => {
    const sandbox = makeSandbox({
      getProcess: vi.fn().mockResolvedValue(null),
    });
    expect(await getProcessStatus(sandbox, 'gone')).toEqual({
      status: 'unknown',
      exitCode: null,
      found: false,
    });
  });

  it('killProcess forwards the signal', async () => {
    const sandbox = makeSandbox();
    await killProcess(sandbox, 'proc_1', 'SIGTERM');
    expect(sandbox.killProcess).toHaveBeenCalledWith('proc_1', 'SIGTERM');
  });

  it('writeFile forwards path/content/encoding', async () => {
    const sandbox = makeSandbox();
    const result = await writeFile(sandbox, {
      path: '/workspace/a.txt',
      content: 'hi',
      encoding: 'utf-8',
    });
    expect(sandbox.writeFile).toHaveBeenCalledWith('/workspace/a.txt', 'hi', {
      encoding: 'utf-8',
    });
    expect(result).toEqual({ ok: true });
  });

  it('writeFile creates the parent directory first (harness contract)', async () => {
    const sandbox = makeSandbox();
    await writeFile(sandbox, {
      path: "/workspace/.harness-bootstrap/impl/it's.json",
      content: '{}',
      encoding: 'utf-8',
    });
    expect(sandbox.exec).toHaveBeenCalledWith(
      `mkdir -p '/workspace/.harness-bootstrap/impl'`,
    );
    const execOrder = (sandbox.exec as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const writeOrder = (sandbox.writeFile as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(execOrder).toBeLessThan(writeOrder);
  });

  it('readFile returns { exists: true, content } on success', async () => {
    const sandbox = makeSandbox();
    const result = await readFile(sandbox, { path: '/workspace/a.txt' });
    expect(result).toEqual({ exists: true, content: 'hello' });
  });

  it('readFile maps success:false to { exists: false }', async () => {
    const sandbox = makeSandbox({
      readFile: vi.fn().mockResolvedValue({ success: false, content: '' }),
    });
    const result = await readFile(sandbox, { path: '/missing' });
    expect(result).toEqual({ exists: false });
  });

  it('readFile maps a not-found throw to { exists: false }', async () => {
    const sandbox = makeSandbox({
      readFile: vi.fn().mockRejectedValue(new Error('ENOENT: no such file')),
    });
    const result = await readFile(sandbox, { path: '/missing' });
    expect(result).toEqual({ exists: false });
  });

  it('readFile rethrows non-not-found errors so real failures stay loud', async () => {
    const sandbox = makeSandbox({
      readFile: vi.fn().mockRejectedValue(new Error('permission denied')),
    });
    await expect(readFile(sandbox, { path: '/secret' })).rejects.toThrow(
      'permission denied',
    );
  });

  it('exposePort returns { url, port }', async () => {
    const sandbox = makeSandbox();
    const result = await exposePort(sandbox, {
      port: 4000,
      hostname: 'example.com',
    });
    expect(sandbox.exposePort).toHaveBeenCalledWith(4000, {
      hostname: 'example.com',
      name: undefined,
      token: undefined,
    });
    expect(result).toEqual({ url: 'https://4000-x.example.com', port: 4000 });
  });

  it('unexposePort / getExposedPorts / stop / destroy', async () => {
    const sandbox = makeSandbox();
    expect(await unexposePort(sandbox, 4000)).toEqual({ ok: true });
    expect(await getExposedPorts(sandbox, 'example.com')).toEqual({
      ports: [{ url: 'https://4000-x.example.com', port: 4000 }],
    });
    expect(await stopSandbox(sandbox)).toEqual({ ok: true });
    expect(await destroySandbox(sandbox)).toEqual({ ok: true });
  });
});
