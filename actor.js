export function actorJson(pubkey, domain, account, actorInfo) {
  if (!pubkey || !domain || !account || !actorInfo) {
    throw new Error('Missing required argument');
  }
  return {
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
  };
}

export function actorJsonMock(pubkey, domain, accountName) {
  if (!pubkey || !domain || !accountName) {
    throw new Error('Missing required argument');
  }
  return {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    id: `https://${domain}/u/${accountName}`,
    type: 'Person',
    preferredUsername: `${accountName}`,
    name: accountName,
    summary: 'A mock user for testing purposes',
    inbox: `https://${domain}/inbox`,
    outbox: `https://${domain}/u/${accountName}/outbox`,
    followers: `https://${domain}/u/${accountName}/followers`,
    following: `https://${domain}/u/${accountName}/following`,
    endpoints: {
      sharedInbox: `https://${domain}/inbox`,
    },
    publicKey: {
      id: `https://${domain}/u/${accountName}#main-key`,
      owner: `https://${domain}/u/${accountName}`,
      publicKeyPem: pubkey,
    },
  };
}

export function webfingerJson(domain, accountName) {
  if (!domain || !accountName) {
    throw new Error('Missing required argument');
  }
  return {
    subject: `acct:${accountName}@${domain}`,
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `https://${domain}/u/${accountName}`,
      },
    ],
  };
}
