import { actorJson, actorJsonMock, webfingerJson } from '../actor';

describe('Actor Functions', () => {
  const pubkey = 'test-public-key';
  const domain = 'example.com';
  const account = 'testuser';
  const actorInfo = {
    displayName: 'Test User',
    description: 'A test user for unit testing',
    avatar: 'https://example.com/avatar.png',
  };

  test('actorJson should return correct JSON structure', () => {
    const result = actorJson(pubkey, domain, account, actorInfo);
    expect(result).toEqual({
      '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
      id: `https://${domain}/u/${account}`,
      type: 'Person',
      preferredUsername: `${account}`,
      name: actorInfo.displayName,
      summary: actorInfo.description,
      inbox: `https://${domain}/inbox`,
      outbox: `https://${domain}/u/${account}/outbox`,
      followers: `https://${domain}/u/${account}/followers`,
      following: `https://${domain}/u/${account}/following`,
      endpoints: {
        sharedInbox: `https://${domain}/inbox`,
      },
      publicKey: {
        id: `https://${domain}/u/${account}#main-key`,
        owner: `https://${domain}/u/${account}`,
        publicKeyPem: pubkey,
      },
    });
  });

  test('actorJsonMock should return correct JSON structure', () => {
    const result = actorJsonMock(pubkey, domain, account);
    expect(result).toEqual({
      '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
      id: `https://${domain}/u/${account}`,
      type: 'Person',
      preferredUsername: `${account}`,
      name: account,
      summary: 'A mock user for testing purposes',
      inbox: `https://${domain}/inbox`,
      outbox: `https://${domain}/u/${account}/outbox`,
      followers: `https://${domain}/u/${account}/followers`,
      following: `https://${domain}/u/${account}/following`,
      endpoints: {
        sharedInbox: `https://${domain}/inbox`,
      },
      publicKey: {
        id: `https://${domain}/u/${account}#main-key`,
        owner: `https://${domain}/u/${account}`,
        publicKeyPem: pubkey,
      },
    });
  });

  test('webfingerJson should return correct JSON structure', () => {
    const result = webfingerJson(domain, account);
    expect(result).toEqual({
      subject: `acct:${account}@${domain}`,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: `https://${domain}/u/${account}`,
        },
      ],
    });
  });
});

describe('Error Handling', () => {
  test('actorJson should throw an error if any argument is missing', () => {
    expect(() => actorJson()).toThrow('Missing required argument');
    expect(() => actorJson('pubkey')).toThrow('Missing required argument');
    expect(() => actorJson('pubkey', 'domain')).toThrow('Missing required argument');
    expect(() => actorJson('pubkey', 'domain', 'account')).toThrow('Missing required argument');
  });

  test('actorJsonMock should throw an error if any argument is missing', () => {
    expect(() => actorJsonMock()).toThrow('Missing required argument');
    expect(() => actorJsonMock('pubkey')).toThrow('Missing required argument');
    expect(() => actorJsonMock('pubkey', 'domain')).toThrow('Missing required argument');
  });

  test('webfingerJson should throw an error if any argument is missing', () => {
    expect(() => webfingerJson()).toThrow('Missing required argument');
    expect(() => webfingerJson('domain')).toThrow('Missing required argument');
  });
});
