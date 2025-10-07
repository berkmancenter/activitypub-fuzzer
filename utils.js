import crypto from 'crypto';

export function uniqueArray(arr) {
  const uniqueArr = [...new Set(arr)];
  return uniqueArr;
}

export function isValidUrl(string) {
  /* eslint-disable no-new */
  try {
    new URL(string);
    return true;
  } catch (error) {
    return false;
  }
}

export function parseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (isValidUrl(jsonString)) {
      return {
        id: jsonString,
        type: 'Object',
      };
    }
    return { error };
  }
}

// This function creates a mock object, assigns it a dereferenceable ID, and stores it in the database.
export function createDereferenceableMockObject(object, domain, account, fuzzdb) {
  const newObject = object;
  return new Promise((resolve, reject) => {
    const guid = crypto.randomBytes(16).toString('hex');
    newObject.id = `https://${domain}/m/${guid}`;
    const message = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `https://${domain}/m/${guid}/activity`,
      type: 'Create',
      object: newObject,
      actor: `https://${domain}/u/${account}`,
    };
    fuzzdb.run('INSERT INTO messages (guid, message) VALUES (?, ?)', [guid, JSON.stringify(message)], (err) => {
      if (err) {
        reject(err);
      } else {
        // console.log(`Message stored with GUID: ${guid}, id: ${newObject.id}`);
        // console.log('message', message);
        resolve(newObject.id);
      }
    });
  });
}
