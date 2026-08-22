/**
 * Compile-time conformance: the value returned by createCloudflareSandbox must
 * satisfy HarnessV1SandboxProvider with no casts. If the vendored contract and
 * the implementation ever drift, this file fails to typecheck (and Jest fails to
 * compile it), which is the signal. When m17/t004 lands ai@7, swap the import
 * below for `import type { HarnessV1SandboxProvider } from "@ai-sdk/harness"` to
 * prove conformance against the real package.
 */
import { createCloudflareSandbox } from '../cloudflare-sandbox-provider';
import type { HarnessV1SandboxProvider } from '../harness-contract';

describe('cloudflare sandbox provider conformance', () => {
  it('satisfies HarnessV1SandboxProvider structurally', () => {
    const provider: HarnessV1SandboxProvider = createCloudflareSandbox({
      controlPlaneUrl: 'http://localhost:8788',
      adminToken: 'tok',
      previewHostname: 'example.com',
    });
    expect(provider.specificationVersion).toBe('harness-sandbox-v1');
    expect(provider.providerId).toBe('cloudflare-sandbox');
    expect(typeof provider.createSession).toBe('function');
    expect(typeof provider.resumeSession).toBe('function');
  });
});
