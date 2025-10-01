import mockAndFormat from '../mock';
import { parseJSON } from '../utils';

describe('mockAndFormat', () => {
  const app = {
    get: jest.fn((key) => {
      if (key === 'config') {
        return { DOMAIN: 'example.com', ACCOUNT: 'testuser' };
      }
      if (key === 'fuzzdb') {
        return {
          run: jest.fn((query, params, callback) => callback(null)),
        };
      }
      return null;
    }),
  };

  test('should format schema with replaced URIs and strings', async () => {
    const schema = JSON.stringify({
      id: '<uri>',
      type: 'Note',
      actor: '<uri>',
      object: {
        content: '<string>',
        attributedTo: '<uri>',
      },
    });
    const notes = 'Test Note';
    const software = 'Test Software';

    const formattedSchema = await mockAndFormat(schema, notes, software, app);
    const parsedSchema = parseJSON(formattedSchema);

    expect(parsedSchema.id).toMatch(/https:\/\/example\.com\/m\/\w{32}\/activity/);
    expect(parsedSchema.actor).toBe('https://example.com/u/testuser');
    expect(parsedSchema.object.content).toContain('example Test Note');
    expect(parsedSchema.object.attributedTo).toBe('https://example.com/u/testuser');
  });

  test('should handle object.tag array', async () => {
    const schema = JSON.stringify({
      id: '<uri>',
      type: 'Note',
      actor: '<uri>',
      object: {
        content: '<string>',
        attributedTo: '<uri>',
        tag: [
          {
            type: 'Hashtag',
            href: '<uri>',
            name: '<string>',
          },
          {
            type: 'Mention',
            href: '<uri>',
            name: '<string>',
          },
          {
            type: 'Emoji',
            href: '<uri>',
            name: '<string>',
          },
        ],
      },
    });
    const notes = 'Test Note';
    const software = 'Test Software';

    const formattedSchema = await mockAndFormat(schema, notes, software, app);
    const parsedSchema = parseJSON(formattedSchema);

    expect(parsedSchema.id).toMatch(/https:\/\/example\.com\/m\/\w{32}\/activity/);
    expect(parsedSchema.actor).toBe('https://example.com/u/testuser');
    expect(parsedSchema.object.tag[0].href).toBe('https://example.com/hashtag/cats');
    expect(parsedSchema.object.tag[1].href).toBe('https://example.com/u/someUser');
    expect(parsedSchema.object.tag[2].href).toMatch(/https:\/\/example\.com\/m\/\w{32}/);
    expect(parsedSchema.actor).toBe('https://example.com/u/testuser');
    expect(parsedSchema.object.attributedTo).toBe('https://example.com/u/testuser');
  });

  test('should handle object.tag as single object', async () => {
    const schema = JSON.stringify({
      id: '<uri>',
      type: 'Note',
      actor: '<uri>',
      object: {
        content: '<string>',
        attributedTo: '<uri>',
        tag: {
          type: 'Hashtag',
          href: '<uri>',
          name: '<string>',
        },
      },
    });
    const notes = 'Test Note';
    const software = 'Test Software';

    const formattedSchema = await mockAndFormat(schema, notes, software, app);
    const parsedSchema = parseJSON(formattedSchema);

    expect(parsedSchema.id).toMatch(/https:\/\/example\.com\/m\/\w{32}\/activity/);
    expect(parsedSchema.actor).toBe('https://example.com/u/testuser');
    expect(parsedSchema.object.tag.href).toBe('https://example.com/hashtag/cats');
    expect(parsedSchema.object.attributedTo).toBe('https://example.com/u/testuser');
  });
  test('should handle empty notes gracefully', async () => {
    const schema = JSON.stringify({
      id: '<uri>',
      type: 'Note',
      actor: '<uri>',
      object: {
        content: '<string>',
        attributedTo: '<uri>',
      },
    });
    const notes = 'null';
    const software = 'Test Software';

    const formattedSchema = await mockAndFormat(schema, notes, software, app);
    const parsedSchema = parseJSON(formattedSchema);

    expect(parsedSchema.object.content).toContain('example Note(undefined) from Test Software (object.content)');
  });
});
