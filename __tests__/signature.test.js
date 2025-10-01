import crypto from 'crypto';
import { getSignature, getDigest, getSignatureParams, getSignatureHeader, signedFetch } from '../signature';

describe('Signature Functions', () => {
  const privkey = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }).privateKey;

  test('getSignature should return a base-64 encoded signature', () => {
    const data = 'test data';
    const signature = getSignature(privkey, data);
    expect(typeof signature).toBe('string');
  });

  test('getDigest should return a base-64 encoded SHA-256 digest', () => {
    const data = 'test data';
    const digest = getDigest(data);
    expect(typeof digest).toBe('string');
  });

  test('getSignatureParams should return correct signature parameters', () => {
    const method = 'GET';
    const url = 'https://example.com/path?query=1';
    const params = getSignatureParams(null, method, url);
    expect(params).toHaveProperty('(request-target)');
    expect(params).toHaveProperty('host');
    expect(params).toHaveProperty('date');
  });

  test('getSignatureHeader should return a correctly formatted signature header', () => {
    const signature = 'test-signature';
    const signatureKeys = ['(request-target)', 'host', 'date'];
    const header = getSignatureHeader(signature, signatureKeys);
    expect(header).toContain('keyId=');
    expect(header).toContain('algorithm="rsa-sha256"');
    expect(header).toContain('headers="(request-target) host date"');
    expect(header).toContain(`signature="${signature}"`);
  });

  test('signedFetch should throw an error if no private key is found', async () => {
    const db = {
      get: (query, callback) => callback(null, { privkey: null }),
    };
    await expect(signedFetch(db, 'https://example.com')).rejects.toThrow('No private key found');
  });
});
