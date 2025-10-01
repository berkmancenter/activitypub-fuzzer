import { createDereferenceableMockObject, isValidUrl, parseJSON } from '../utils';

describe('Utility Functions', () => {
  test('isValidUrl should return true for valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  test('should handle database errors gracefully', async () => {
    const mockObject = { type: 'Note', content: 'This is a test note' };
    const domain = 'example.com';
    const account = 'testuser';
    const fuzzdb = {
      run: jest.fn((query, params, callback) => callback(new Error('Database error'))),
    };

    await expect(createDereferenceableMockObject(mockObject, domain, account, fuzzdb)).rejects.toThrow('Database error');
  });

  test('isValidUrl should return false for invalid URLs', () => {
    expect(isValidUrl('invalid-url')).toBe(false);
  });

  test('parseJSON should parse valid JSON strings', () => {
    const jsonString = '{"key": "value"}';
    expect(parseJSON(jsonString)).toEqual({ key: 'value' });
  });

  test('parseJSON should return an object with id and type for valid URL strings', () => {
    const urlString = 'https://example.com';
    expect(parseJSON(urlString)).toEqual({ id: urlString, type: 'Object' });
  });

  test('parseJSON should return an error object for invalid JSON strings', () => {
    const invalidJsonString = '{"key": "value"';
    expect(parseJSON(invalidJsonString)).toHaveProperty('error');
  });
});

describe('createDereferenceableMockObject', () => {
  test('should create a mock object and store it in the database', async () => {
    const mockObject = { type: 'Note', content: 'This is a test note' };
    const domain = 'example.com';
    const account = 'testuser';
    const fuzzdb = {
      run: jest.fn((query, params, callback) => callback(null)),
    };

    const result = await createDereferenceableMockObject(mockObject, domain, account, fuzzdb);

    expect(result).toMatch(new RegExp(`https://${domain}/m/\\w{32}`));
    expect(fuzzdb.run).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO messages'), expect.any(Array), expect.any(Function));
  });
});
