import express from 'express'; // Import express module
import { engine } from 'express-handlebars'; // Import express-handlebars
import Handlebars from 'handlebars'; // Import Handlebars
import cors from 'cors'; // Import cors module
import crypto from 'crypto'; // Import crypto module
import dotenv from 'dotenv';
import initializeDatabases from './db-init.js';
import { signedPostJSON, signedGetJSON } from './signature.js';
import { parseJSON } from './utils.js';
import { actorJsonMock, webfingerJson } from './actor.js';
import mockAndFormat from './mock.js';
import wellKnownRoute from './routes/well-known.js';
import nodeinfoRoute from './routes/nodeinfo.js';

dotenv.config({ path: '.env' });

const config = {
  DEFAULT_TARGET_ENDPOINT: process.env.DEFAULT_TARGET_ENDPOINT,
  DEFAULT_TARGET_USER_ID: process.env.DEFAULT_TARGET_USER_ID,
  DOMAIN: process.env.DOMAIN,
  PORT: process.env.PORT || 3000,
  ACCOUNT: process.env.ACCOUNT,
  ACTOR_DISPLAY_NAME: process.env.ACTOR_DISPLAY_NAME,
  ACTOR_DESCRIPTION: process.env.ACTOR_DESCRIPTION,
  ACTOR_AVATAR: process.env.ACTOR_AVATAR,
};

// Initialize express app

const app = express(); // Create an express application
const port = config.PORT;
const domain = config.DOMAIN;
const account = config.ACCOUNT || 'fuzzer';
const actorInfo = {
  displayName: config.ACTOR_DISPLAY_NAME || 'Fuzzer', // Define the display name
  description: config.ACTOR_DESCRIPTION || 'An ActivityPub fuzzing tool', // Define the description
  avatar: config.ACTOR_AVATAR || `https://${domain}/images/cat.png`, // Define the avatar URL
};

app.set('config', config);

// Register Handlebars helper
Handlebars.registerHelper('decodeURI', function (uri) {
  return decodeURIComponent(uri);
});
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.use('/images', express.static('public/images'));
app.use(express.json({
  type: [ 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
          'application/activity+json',
          'application/activity+json; charset=utf-8'
        ]
}));
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

let targetEndpoint = config.DEFAULT_TARGET_ENDPOINT; // Variable to store the target endpoint

const { db, fuzzdb } = initializeDatabases(actorInfo, domain, account);
app.set('db', db);
app.set('fuzzdb', fuzzdb);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

function createOrGetAccount(accountName) {
  // Check if an account by accountName already exists
  return new Promise((resolve, reject) => {
    fuzzdb.get('SELECT name FROM accounts WHERE name = ?', [accountName], (err, row) => {
      if (err) {
        reject(new Error('Error querying database'));
      }
      if (!row) {
        console.log('Creating account:', accountName);
        return crypto.generateKeyPair(
          'rsa',
          {
            modulusLength: 4096,
            publicKeyEncoding: {
              type: 'spki',
              format: 'pem',
            },
            privateKeyEncoding: {
              type: 'pkcs8',
              format: 'pem',
            },
          },
          async (error, publicKey, privateKey) => {
            if (error) return false;
            try {
              console.log('creating account', accountName);
              const actorName = accountName;
              const actorRecord = actorJsonMock(publicKey, domain, accountName);
              const webfingerRecord = webfingerJson(domain, accountName);

              await fuzzdb.run(
                'INSERT OR REPLACE INTO accounts (name, actor, pubkey, privkey, webfinger) VALUES (?, ?, ?, ?, ?)',
                actorName,
                JSON.stringify(actorRecord),
                publicKey,
                privateKey,
                JSON.stringify(webfingerRecord),
              );
              console.log('done');
              return resolve(JSON.stringify(actorRecord));
            } catch (e) {
              return reject(e);
            }
          },
        );
      }

      // Get actor value for accountName from fuzzer DB
      const query = 'SELECT actor FROM accounts WHERE name = ?';
      return fuzzdb.get(query, [accountName], (errAccount, rowAccount) => {
        if (errAccount) {
          console.log(errAccount);
          return reject(new Error('Error querying database'));
        }
        if (!rowAccount) {
          return reject(new Error('Account not found.'));
        }
        return resolve(rowAccount.actor);
      });
    });
  });
}

async function getInboxFromActorProfile(profileUrl) {
  const response = await signedGetJSON(fuzzdb, `${profileUrl}.json`);
  const data = await response.json();

  if (data?.inbox) {
    return data.inbox;
  }
  throw new Error(`Couldn't find inbox at supplied profile url ${profileUrl}`);
}

async function signAndSend(message, target = targetEndpoint) {
  try {
    const guid = parseJSON(message)
      .id.replace(/\/activity$/, '')
      .split('/')
      .pop(); // Extract GUID from message ID

    const parsedJSON = parseJSON(message);
    const strigifiedJSON = JSON.stringify(parsedJSON);

    const response = await signedPostJSON(fuzzdb, target, {
      body: strigifiedJSON,
    });
    const data = await response.text();

    fuzzdb.run('INSERT INTO messages (guid, message) VALUES (?, ?)', [guid, message], (err) => {
      if (err) {
        console.error('Error inserting message into database:', err.message);
      } else {
        console.log(`Message stored with GUID: ${guid}`);
      }
    });

    console.log('Message sent:', strigifiedJSON);
    console.log(`Sent message to an inbox at ${target}!`);
    console.log('Message id:', parsedJSON.id);
    console.log('Response Status Code:', response.status);
    console.log('Response body:', data);
    return guid;
  } catch (error) {
    console.log('Error:', error.message);
    console.log('Stacktrace: ', error.stack);
    return error;
  }
}

async function sendAcceptMessage(thebody) {
  const guid = crypto.randomBytes(16).toString('hex');
  const message = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${domain}/u/${account}/accept/${guid}`,
    type: 'Accept',
    actor: `https://${domain}/u/${account}`,
    object: thebody,
  };

  const inbox = await getInboxFromActorProfile(message.object.actor);

  console.log('sending accept message to inbox:', inbox);
  signAndSend(JSON.stringify(message), inbox);
}

async function handleFollowRequest(req) {
  console.log('Handling follow request:', req.body);
  await sendAcceptMessage(req.body);
}

async function createFollowMessage(target) {
  const guid = crypto.randomBytes(16).toString('hex');
  const followMessage = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${domain}/m/${guid}`,
    type: 'Follow',
    actor: `https://${domain}/u/${account}`,
    object: target || 'https://www.w3.org/ns/activitystreams#Public',
  };
  return followMessage;
}

// Middleware to check for ActivityPub JSON Accept header
function activitypubJSON(req, res, next) {
  if (req.accepts('application/activity+json') || req.accepts('application/ld+json; profile="https://www.w3.org/ns/activitystreams"')) {
    res.set('Content-Type', 'application/activity+json');
  }
  next();
}

// well-known and nodeinfo endpoints

app.use('/.well-known', cors(), activitypubJSON, wellKnownRoute);
app.use('/nodeinfo', cors(), activitypubJSON, nodeinfoRoute);

// ActivityPub endpoints

app.get(`/u/:accountName`, cors(), activitypubJSON, async (req, res) => {
  const actor = await createOrGetAccount(req.params.accountName);
  return res.json(parseJSON(actor));
});

app.post('/inbox', (req, res) => {
  // Check if the Content-Type is application/json
  if (req.accepts('application/activity+json') || req.accepts('application/ld+json; profile="https://www.w3.org/ns/activitystreams"')) {
    if (req.body && req.body.type === 'Follow') {
      handleFollowRequest(req);
    }
  } else {
    res
      .status(406)
      .send(
        'Not Acceptable: This endpoint only accepts application/activity+json and application/ld+json requests. See FEDERATION.md for more information.',
      );
  }
});

app.get('/m/:guid', (req, res) => {
  const { guid } = req.params;
  const query = `SELECT json_extract(message, '$.object') AS message FROM messages WHERE guid = ?`;
  fuzzdb.get(query, [guid], (err, row) => {
    if (err) {
      console.error('Error querying database:', err.message);
      res.status(500).send('Internal Server Error');
    } else if (!row) {
      res.status(404).send('Message not found.');
    } else {
      res.json(parseJSON(row.message));
    }
  });
});

app.get('/m/:guid/activity', (req, res) => {
  const { guid } = req.params;
  const query = 'SELECT message FROM messages WHERE guid = ?';
  fuzzdb.get(query, [guid], (err, row) => {
    if (err) {
      console.error('Error querying database:', err.message);
      res.status(500).send('Internal Server Error');
    } else if (!row) {
      res.status(404).send('Message not found.');
    } else {
      res.json(parseJSON(row.message));
    }
  });
});

app.get(`/hashtag/:hashtag`, cors(), activitypubJSON, async (req, res) => {
  return res.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${domain}/tags/${req.params.hashtag}`,
    type: 'OrderedCollection',
  });
});

// Application API

app.post('/post-to-endpoint', async function (req, res) {
  if (!targetEndpoint) {
    return res.status(400).send('Target endpoint is not set.');
  }
  const { schema } = req.body;

  if (!schema) {
    return res.status(400).send('No schema to post.');
  }

  const guid = await signAndSend(schema);
  return res.status(200).redirect(301, `/m/${guid}/activity`);
});

app.post('/sendFollow', express.urlencoded({ extended: false }), async function (req, res) {
  const url = targetEndpoint;
  const target = config.DEFAULT_TARGET_USER_ID;
  const followMessage = await createFollowMessage(target);
  console.log('sending follow to inbox:', url);
  console.log('follow message:', followMessage);
  signAndSend(JSON.stringify(followMessage), url);

  return res.send(`sending follow to ${url}`);
});

let firehoseInterval;

app.get('/firehose/stop', (req, res) => {
  if (firehoseInterval) {
    clearInterval(firehoseInterval);
    res.send(`Firehose stopped.`);
  }
});

app.get('/firehose/start', (req, res) => {
  function randomSchemaDistributed() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM schemas, schemasSoftware WHERE hash = schemaHash';
      db.all(query, (err, rows) => {
        if (err) {
          console.error('Error querying database:', err.message);
          reject(new Error(err));
        } else {
          const totalSum = rows.reduce((sum, row) => sum + row.total, 0);
          const randomValue = Math.random() * totalSum;
          let cumulativeSum = 0;
          // eslint-disable-next-line no-restricted-syntax
          for (const row of rows) {
            cumulativeSum += row.total;
            if (randomValue <= cumulativeSum) {
              resolve(row);
              break;
            }
          }
        }
      });
    });
  }

  const delay = parseInt(req.query.delay, 10);
  if (Number.isNaN(delay) || delay <= 0) {
    return res.status(400).send('Invalid delay parameter. It must be a positive integer.');
  }

  const rewriteAnnounceToCreate = req.query.rewriteAnnounceToCreate === 'true';

  if (firehoseInterval) {
    clearInterval(firehoseInterval);
  }

  firehoseInterval = setInterval(async () => {
    try {
      const row = await randomSchemaDistributed();
      console.log('Random schema selected:', row.hash, row.total, row.software);
      const formattedSchema = await mockAndFormat(row.schema, decodeURIComponent(row.notes), row.software, app, rewriteAnnounceToCreate);
      const response = await fetch(`http://localhost:${port}/post-to-endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema: formattedSchema }),
      });

      if (!response.ok) {
        console.error('Failed to post schema:', response.statusText);
      } else {
        console.log('Schema posted successfully');
      }
    } catch (error) {
      console.error('Error fetching random schema:', error);
    }
  }, delay);

  return res.send(`Firehose started with a delay of ${delay} milliseconds.`);
});

app.post('/set-target', (req, res) => {
  targetEndpoint = req.body.targetEndpoint;
  console.log('Target Endpoint set to:', targetEndpoint);
  res.redirect('/'); // Redirect back to the home page
});

app.get('/', (req, res) => {
  const query = 'SELECT SUM(total) AS totalSum FROM schemas';
  db.get(query, (err, row) => {
    if (err) {
      console.error('Error querying database:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      const totalSum = row.totalSum || 0; // Default to 0 if null
      res.render('home', { totalSum, targetEndpoint }); // Pass totalSum and targetEndpoint to the template
    }
  });
});

app.get('/unique-software', (req, res) => {
  const query = 'SELECT DISTINCT software FROM schemasSoftware';
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      const softwareList = rows.map((row) => row.software);
      res.json(softwareList);
    }
  });
});

app.get('/schemas-with-notes', (req, res) => {
  const query = 'SELECT notes, hash FROM schemas WHERE notes IS NOT NULL';
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      const schemas = rows.map((row) => ({
        displayName: `${decodeURIComponent(row.notes)} - ${row.hash}`,
        hash: row.hash,
      }));
      res.json(schemas);
    }
  });
});

app.get('/distinct-types', (req, res) => {
  const query = "SELECT DISTINCT json_extract(schema, '$.type') AS type FROM schemas";
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      const types = rows.map((row) => row.type);
      res.json(types);
    }
  });
});

app.get('/random-schema-json', async (req, res) => {
  const { types, notesOnly, software } = req.query;
  const rewriteAnnounceToCreate = req.query.rewriteAnnounceToCreate === 'true';
  const notesOnlyBoolean = notesOnly === 'true';
  const typeList = types ? types.split(',') : [];
  const query =
    typeList.length > 0
      ? `SELECT schema, hash, notes, software FROM schemas, schemasSoftware WHERE hash = schemaHash AND json_extract(schema, '$.type') IN (${typeList.map(() => '?').join(',')}) ${notesOnlyBoolean ? 'AND notes IS NOT NULL' : ''} ${software ? `AND hash IN (select schemaHash from schemasSoftware where software = '${software}')` : ''} AND hash != 'c39fcca0edebff633e254f9397cafc90' ORDER BY RANDOM() LIMIT 1`
      : `SELECT schema, hash, notes, software FROM schemas, schemasSoftware WHERE hash = schemaHash AND schema IS NOT NULL ${notesOnlyBoolean ? 'AND notes IS NOT NULL' : ''} ${software ? `AND hash IN (select schemaHash from schemasSoftware where software = '${software}')` : ''} AND hash != 'c39fcca0edebff633e254f9397cafc90' ORDER BY RANDOM() LIMIT 1`;
  db.get(query, typeList, async (err, row) => {
    if (err) {
      console.error('Error querying database:', err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    } else if (!row) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const formattedSchema = await mockAndFormat(row.schema, decodeURIComponent(row.notes), row.software, app, rewriteAnnounceToCreate);
      res.json({ ...row, schema: formattedSchema });
    }
  });
});

// This function is just for rendering on the web frontend and I'll probably get rid of it at some point
app.get('/random-schema', async (req, res) => {
  const { types, notesOnly } = req.query;
  const rewriteAnnounceToCreate = req.query.rewriteAnnounceToCreate === 'true';
  const notesOnlyBoolean = notesOnly === 'true';
  const typeList = types ? types.split(',') : [];
  const query =
    typeList.length > 0
      ? `SELECT schema, hash, notes, software FROM schemas, schemasSoftware WHERE hash = schemaHash AND json_extract(schema, '$.type') IN (${typeList.map(() => '?').join(',')}) ${notesOnlyBoolean ? 'AND notes IS NOT NULL' : ''} ORDER BY RANDOM() LIMIT 1`
      : `SELECT schema, hash, notes, software FROM schemas, schemasSoftware WHERE hash = schemaHash AND ${notesOnlyBoolean ? 'notes IS NOT NULL' : ''} ORDER BY RANDOM() LIMIT 1`;
  db.get(query, typeList, async (err, row) => {
    if (err) {
      console.error('Error querying database:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      const formattedSchema = await mockAndFormat(row.schema, decodeURIComponent(row.notes), row.software, app, rewriteAnnounceToCreate);
      res.render('home', { totalSum: 0, targetEndpoint, randomSchema: { ...row, schema: formattedSchema } }); // Pass formattedSchema to the template
    }
  });
});

app.get('/show-schema', async (req, res) => {
  const { hash } = req.query;
  const rewriteAnnounceToCreate = req.query.rewriteAnnounceToCreate === 'true';
  if (!hash) {
    return res.status(400).send('Hash is required.');
  }

  const query = 'SELECT schema, hash, notes, software FROM schemas, schemasSoftware WHERE hash = schemaHash AND hash = ?';
  return db.get(query, [hash], async (err, row) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).send('Internal Server Error');
    }
    if (!row) {
      return res.status(404).send('Schema not found.');
    }

    // Format the schema as pretty-printed JSON
    const formattedSchema = await mockAndFormat(row.schema, decodeURIComponent(row.notes), row.software, app, rewriteAnnounceToCreate);
    let htmlFormattedSchema = formattedSchema;
    htmlFormattedSchema = formattedSchema.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return res.render('home', { totalSum: 0, targetEndpoint, randomSchema: { ...row, schema: formattedSchema, htmlFormattedSchema } }); // Pass formattedSchema to the template
  });
});

export default app;
