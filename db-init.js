import sqlite3 from 'sqlite3'; // Import sqlite3 module
import crypto from 'crypto'; // Import crypto module
import { actorJson, webfingerJson } from './actor.js';

export default function initializeDatabases(actorInfo, domain, account) {
  // Open SQLite database for the imported Observatory data
  const db = new sqlite3.Database('./observatory.db', (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
    }
  });

  // Open SQLite database for fuzzer the application itself
  const fuzzdb = new sqlite3.Database('./fuzzer.db', (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
    }
  });

  // Create the "messages" table if it doesn't exist
  fuzzdb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'", (err, row) => {
    if (err) {
      console.error('Error checking for messages table:', err.message);
    } else if (!row) {
      fuzzdb.run(
        `CREATE TABLE messages (
          guid TEXT PRIMARY KEY,
          message TEXT
        )`,
        (dbErr) => {
          if (dbErr) {
            console.error('Error creating messages table:', dbErr.message);
          } else {
            console.log('Messages table created successfully.');
          }
        },
      );
    } else {
      console.log('Messages table already exists.');
    }
  });

  // Check if the "accounts" table exists, and create it if it doesn't
  fuzzdb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'", (err, row) => {
    if (err) {
      console.error('Error checking for accounts table:', err.message);
    } else if (!row) {
      fuzzdb.run(
        `CREATE TABLE accounts (
        name TEXT,
        privkey TEXT,
        pubkey TEXT,
        webfinger TEXT,
        actor TEXT
        )`,
        (dbErr) => {
          if (dbErr) {
            console.error('Error creating accounts table:', dbErr.message);
          } else {
            console.log('Accounts table created successfully.');
          }
        },
      );
      // create the main actor account for activitypub-fuzzer
      crypto.generateKeyPair(
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
            const actorName = account;
            const actorRecord = actorJson(publicKey, domain, account, actorInfo);
            const webfingerRecord = webfingerJson(domain, account);

            await fuzzdb.run(
              'INSERT OR REPLACE INTO accounts (name, actor, pubkey, privkey, webfinger) VALUES (?, ?, ?, ?, ?)',
              actorName,
              JSON.stringify(actorRecord),
              publicKey,
              privateKey,
              JSON.stringify(webfingerRecord),
            );
            console.log('Record created for primary Fuzzer ActivityPub Actor and webfinger');
            console.log('Actor ID:', actorRecord.id);
            console.log('Webfinger uri:', `https://${domain}/.well-known/webfinger?resource=${webfingerRecord.subject}`);
            return true;
          } catch (e) {
            console.log('Error inserting account:', e);
            return false;
          }
        },
      );
    } else {
      console.log('Accounts table already exists.');
    }
  });

  return { db, fuzzdb };
}
