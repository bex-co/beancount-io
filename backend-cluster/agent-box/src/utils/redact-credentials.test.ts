import { redactCredentials, redactObject } from './redact-credentials';

describe('redactCredentials', () => {
  it('should redact HTTPS URLs with username:password', () => {
    const input = 'Cloning https://user:pass@github.com/repo.git';
    const expected = 'Cloning https://***@github.com/repo.git';
    expect(redactCredentials(input)).toBe(expected);
  });

  it('should redact HTTP URLs with token', () => {
    const input = 'remote: http://token123@git.beancount.io/user/repo.git';
    const expected = 'remote: http://***@git.beancount.io/user/repo.git';
    expect(redactCredentials(input)).toBe(expected);
  });

  it('should redact Bearer tokens', () => {
    const input = 'Authorization: Bearer ghp_1234567890abcdef';
    const expected = 'Authorization: Bearer ***';
    expect(redactCredentials(input)).toBe(expected);
  });

  it('should handle multiple credentials in same string', () => {
    const input = 'Clone https://tok1@github.com/a.git and https://tok2@gitlab.com/b.git';
    const expected = 'Clone https://***@github.com/a.git and https://***@gitlab.com/b.git';
    expect(redactCredentials(input)).toBe(expected);
  });

  it('should not modify URLs without credentials', () => {
    const input = 'Cloning https://github.com/user/repo.git';
    expect(redactCredentials(input)).toBe(input);
  });

  it('should handle empty strings', () => {
    expect(redactCredentials('')).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(redactCredentials(null as any)).toBe(null);
    expect(redactCredentials(undefined as any)).toBe(undefined);
  });

  it('should redact API key patterns', () => {
    const input = 'apikey=abc123 and token:xyz789';
    const expected = 'apikey=*** and token:***';
    expect(redactCredentials(input)).toBe(expected);
  });

  it('should redact Authorization headers', () => {
    const input = 'Authorization: Basic dXNlcjpwYXNz';
    const expected = 'Authorization: ***';
    expect(redactCredentials(input)).toBe(expected);
  });
});

describe('redactObject', () => {
  it('should redact token fields in objects', () => {
    const input = { token: 'secret123', data: 'public' };
    const expected = { token: '***', data: 'public' };
    expect(redactObject(input)).toEqual(expected);
  });

  it('should redact nested URLs', () => {
    const input = {
      url: 'https://token@github.com/repo.git',
      nested: { password: 'pass123' }
    };
    const result = redactObject(input);
    expect(result.url).toBe('https://***@github.com/repo.git');
    expect(result.nested.password).toBe('***');
  });

  it('should handle arrays', () => {
    const input = ['https://token@github.com/a.git', 'normal string'];
    const result = redactObject(input);
    expect(result[0]).toBe('https://***@github.com/a.git');
    expect(result[1]).toBe('normal string');
  });

  it('should redact password keys case-insensitively', () => {
    const input = { Password: 'secret', TOKEN: 'xyz', ApiKey: 'abc' };
    const result = redactObject(input);
    expect(result.Password).toBe('***');
    expect(result.TOKEN).toBe('***');
    expect(result.ApiKey).toBe('***');
  });
});
