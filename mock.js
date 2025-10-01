import crypto from 'crypto';
import { parseJSON, createDereferenceableMockObject } from './utils.js';

// Function to replace each <uri> with a unique GUID-based URL
function replaceUriWithGuid(schema, guid, domain) {
  return schema.replace(/<uri>/g, () => `https://${domain}/m/${guid}`);
}

// Function to replace the string "<string>" with example string
function replaceStringWithExampleString(schema, string) {
  let result = schema.replace(/<string>/g, 'exampleString');
  const parsedSchema = parseJSON(result);

  // for each deep value of parsedSchema where the value is "exampleString", replace it with "exampleString (key)"
  // function to get all keys in a deep object
  function getDeepKeys(obj) {
    let keys = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.keys(obj || {})) {
      keys.push(key);
      if (typeof obj[key] === 'object') {
        const subkeys = getDeepKeys(obj[key]);
        keys = keys.concat(
          subkeys.map(function (subkey) {
            return `${key}.${subkey}`;
          }),
        );
      }
    }
    return keys;
  }

  // rewrite getDeepKeys to return an array of both the key path and the value at that path
  const deepKeys = getDeepKeys(parsedSchema);
  let stuff = [];
  deepKeys.forEach((key) => {
    const value = key.split('.').reduce((o, i) => o[i], parsedSchema);
    if (value && value.includes && value.includes('exampleString')) {
      stuff.push(`example ${string} (${key}) `);
    }
  });
  while (result.match(/"exampleString"/)) {
    result = result.replace(/exampleString/, stuff[0]);
    stuff = stuff.slice(1);
  }

  return result;
}

// Function to replace the string "<date-time>" with an ISO string with the current datetime
function replaceDateWithISOString(schema) {
  return schema.replace(/<date-time>/g, new Date().toISOString());
}

// Function to replace the string "boolean" with true/false
function replaceBooleanWithBoolean(schema) {
  return schema.replace(/"<boolean>"/g, Math.random() < 0.5 ? 'true' : 'false');
}

// Function to replace the string "<integer>" with a random integer
function replaceIntegerWithRandomInteger(schema) {
  return schema.replace(/"<integer>"/g, Math.floor(Math.random() * 100));
}

function replaceUndefinedWithEmpty(schema) {
  return schema.replace(/"<undefined>"/g, '');
}

function replaceNullWithNull(schema) {
  return schema.replace(/"<null>"/g, 'null');
}

export default async function mockAndFormat(schema, notes, software, app, rewriteAnnounceToCreate) {
  const parsedSchema = parseJSON(schema);
  const guid = crypto.randomBytes(16).toString('hex');
  const { DOMAIN: domain, ACCOUNT: account } = app.get('config');
  const fuzzdb = app.get('fuzzdb');
  let parsedNotes = notes;
  if (notes === 'null') {
    parsedNotes = `${parsedSchema.type}(${parsedSchema.object?.type}) from ${software || 'unknown software'}`;
  }
  // replace the Activity id with the GUID
  parsedSchema.id = parsedSchema.id.replace(/<uri>/g, () => `https://${domain}/m/${guid}/activity`);
  // replace the `actor` with the url for the actor
  parsedSchema.actor = parsedSchema.actor.replace(/<uri>/g, () => `https://${domain}/u/${account}`);
  // replace `attributedTo` with the url for a generic actor
  if (parsedSchema.object.attributedTo) {
    parsedSchema.object.attributedTo = parsedSchema.object.attributedTo.replace(/<uri>/g, () => `https://${domain}/u/${account}`);
  }
  // replace all href values within the array in parsedSchema.object.tag with a mocked user
  if (parsedSchema.object.tag) {
    if (Array.isArray(parsedSchema.object.tag)) {
      parsedSchema.object.tag.forEach((tag) => {
        const newTag = tag;
        if (tag.type === 'Mention' && tag.href) {
          newTag.href = tag.href.replace(/<uri>/g, () => `https://${domain}/u/someUser`);
        }
        return newTag;
      });
    } else {
      const { tag } = parsedSchema.object;
      if (tag.type === 'Mention' && tag.href) {
        tag.href = tag.href.replace(/<uri>/g, () => `https://${domain}/u/someUser`);
      }
    }
  }

  // clear the object content
  if (parsedSchema.object.content) {
    parsedSchema.object.content = `exampleString`;
  }

  // TODO: in the case of Announce, make it so there's a third party account that is attributed for the announce
  // (simply rewriting $.object.attributedTo with a dereferenceable mock actor isn't sufficient for some reason)
  // For now, we rewrite Announce to Create if rewriteAnnounceToCreate is true
  if (rewriteAnnounceToCreate && parsedSchema.type === 'Announce') {
    parsedSchema.type = 'Create';
  }

  // replace all url values within the array in parsedSchema.object.attachments with a mocked image
  if (parsedSchema.object.attachment && parsedSchema.object.attachment.forEach) {
    parsedSchema.object.attachment.forEach((attachment) => {
      const newAttachment = attachment;
      if ((attachment.type === 'Document' || attachment.type === 'Image' || attachment.type === 'Emoji') && attachment.url) {
        newAttachment.url = attachment.url.replace(/<uri>/g, () => `https://${domain}/images/cat.jpg`);
        newAttachment.mediaType = `image/jpeg`;
      }
      return newAttachment;
    });
  } else if (parsedSchema.object.attachment && !parsedSchema.object.attachment.forEach) {
    const { attachment } = parsedSchema.object;
    const newAttachment = attachment;
    if ((attachment.type === 'Document' || attachment.type === 'Image' || attachment.type === 'Emoji') && attachment.url) {
      newAttachment.url = attachment.url.replace(/<uri>/g, () => `https://${domain}/images/cat.jpg`);
      newAttachment.mediaType = `image/jpeg`;
    }
    return newAttachment;
  }

  // rewrite inReplyTo to be a mocked basic ActivityPub message
  if (parsedSchema.object.inReplyTo && parsedSchema.object.inReplyTo === '<uri>') {
    parsedSchema.object.inReplyTo = `https://${domain}/m/cf098bd74f6d9472c5bc6ebf0f18525a`;
  }

  // TODO write something that can handle [] or {} on a .tag
  if (parsedSchema.object.tag && !Array.isArray(parsedSchema.object.tag)) {
    if (parsedSchema.object.tag.type === 'Hashtag') {
      if (parsedSchema.object.content) {
        parsedSchema.object.content += `I love <a href="https://${domain}/hashtag/cats">#cats</a>`;
      }

      // mock Hashtag
      const Hashtag = parsedSchema.object.tag;
      if (Hashtag) {
        Hashtag.name = '#cats';
        Hashtag.href = `https://${domain}/hashtag/cats`;
        parsedSchema.object.tag = Hashtag;
      }
    }

    if (parsedSchema.object.tag.type === 'Emoji') {
      const Emoji = parsedSchema.object.tag;
      Emoji.name = ':test_emoji:';
      if (Emoji.icon) {
        Emoji.icon.url = `https://${domain}/images/emoji.png`;
        Emoji.icon.mediaType = 'image/png';
        Emoji.updated = new Date().toISOString();
      }
      parsedSchema.object.tag = Emoji;
      if (parsedSchema.object.content) {
        parsedSchema.object.content += ` ${Emoji.name} `;
      }
      const emojiId = await createDereferenceableMockObject(Emoji, domain, account, fuzzdb);
      parsedSchema.object.tag.id = emojiId;
    }

    if (parsedSchema.object.tag.type === 'Mention') {
      if (parsedSchema.object.content) {
        parsedSchema.object.content += `
        check this out, <a href="https://${domain}/u/someUser">@someUser</a>`;
      }
      parsedSchema.object.tag.name = `@someUser@${domain}`;
      parsedSchema.object.tag.href = `https://${domain}/u/someUser`;
    }

    if (parsedSchema.object.type === 'Article') {
      parsedSchema.object.content =
        '<p>This is example article content.</p><p>This is example article content.</p><p>This is example article content.</p><p>This is example article content.</p><p>This is example article content.</p>';
    }
  }

  // use Array.prototype.some to check to see if any object in the parsedSchema.object.tag array contains a type of "Hashtag"
  if (
    parsedSchema.object.tag &&
    Array.isArray(parsedSchema.object.tag) &&
    (parsedSchema.object.tag.some((tag) => tag.type === 'Hashtag') || parsedSchema.object.tag.some((tag) => tag.type === 'Emoji'))
  ) {
    if (parsedSchema.object.content) {
      parsedSchema.object.content += `I love <a href="https://${domain}/hashtag/cats">#cats</a>`;
    }

    if (parsedSchema.object.type === 'Article') {
      parsedSchema.object.content =
        '<p>This is example article content.</p><p>This is example article content.</p><p>This is example article content.</p><p>This is example article content.</p><p>This is example article content.</p>';
    }

    // mock Hashtag
    const Hashtag = parsedSchema.object.tag.find((tag) => tag.type === 'Hashtag');
    const HashtagIndex = parsedSchema.object.tag.findIndex((tag) => tag.type === 'Hashtag');
    if (Hashtag) {
      Hashtag.name = '#cats';
      Hashtag.href = `https://${domain}/hashtag/cats`;
      parsedSchema.object.tag[HashtagIndex] = Hashtag;
    }

    // mock Emoji
    if (parsedSchema.object.tag.some((tag) => tag.type === 'Emoji')) {
      const Emoji = parsedSchema.object.tag.find((tag) => tag.type === 'Emoji');
      const EmojiIndex = parsedSchema.object.tag.findIndex((tag) => tag.type === 'Emoji');
      Emoji.name = ':test_emoji:';
      if (Emoji.icon) {
        Emoji.icon.url = `https://${domain}/images/emoji.png`;
        Emoji.icon.mediaType = 'image/png';
        Emoji.updated = new Date().toISOString();
      }
      parsedSchema.object.tag[EmojiIndex] = Emoji;
      if (parsedSchema.object.content) {
        parsedSchema.object.content += ` ${Emoji.name} `;
      }
      const emojiId = await createDereferenceableMockObject(Emoji, domain, account, fuzzdb);
      parsedSchema.object.tag[EmojiIndex].id = emojiId;
    }
  }

  if (Array.isArray(parsedSchema.object.tag) && parsedSchema.object.tag.some((tag) => tag.type === 'Mention')) {
    if (parsedSchema.object.content) {
      parsedSchema.object.content += `
      check this out, <a href="https://${domain}/u/someUser">@someUser</a>`;
    }
    parsedSchema.object.tag.find((tag) => tag.type === 'Mention').name = `@someUser@${domain}`;
    parsedSchema.object.tag.find((tag) => tag.type === 'Mention').href = `https://${domain}/u/someUser`;
  }
  if (parsedSchema.object.contentMap) {
    // return a basic contentMap per https://www.w3.org/TR/activitystreams-core/#naturalLanguageValues
    parsedSchema.object.contentMap = { und: 'exampleString', de: 'exampleString' };
  }
  if (parsedSchema.object.conversation) {
    parsedSchema.object.conversation = 'exampleString';
  }

  let formattedSchema = JSON.stringify(parsedSchema);
  formattedSchema = replaceUriWithGuid(formattedSchema, guid, domain); // Replace <uri> with GUID
  formattedSchema = replaceStringWithExampleString(formattedSchema, parsedNotes); // Replace <string> with example string
  formattedSchema = replaceDateWithISOString(formattedSchema); // Replace <date-time> with ISO string
  formattedSchema = replaceBooleanWithBoolean(formattedSchema); // Replace <boolean> with true/false
  formattedSchema = replaceIntegerWithRandomInteger(formattedSchema); // Replace <integer> with random integer
  formattedSchema = replaceUndefinedWithEmpty(formattedSchema); // Replace <undefined> with empty string
  formattedSchema = replaceNullWithNull(formattedSchema); // Replace <null> with null
  formattedSchema = JSON.stringify(parseJSON(formattedSchema), null, 2); // .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return formattedSchema;
}
