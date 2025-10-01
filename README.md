# ActivityPub Fuzzer

The ActivityPub Fuzzer is a small program to help developers build social media software on the Fediverse with the ActivityPub protocol. It uses data collected by the [Fediverse Schema Observatory](https://observatory.cyber.harvard.edu) to emulate known Fediverse software, solving the problem where developers have to manually test compatibility with dozens of other projects. The Fuzzer runs in a local development environment. You can tell it to locally emulate a public fire hose, or to send you messages formatted from every known version of a specific software project.

## Requirements

 - Node.js v20 or later

## Installation

You'll need to install the server, configure it, and run it. Before you do that, you'll need to install a tunneling service to make your local server accessible from the internet (no one needs to know its URL exists, this is just to provide an HTTPS connection to "federate" over).

### Install a tunneling service

To make your instance of the Fuzzer accessible from the internet, you can use a tunneling service like [ngrok](https://ngrok.com/) or [fedify tunnel](https://fedify.dev/cli#fedify-tunnel-exposing-a-local-http-server-to-the-public-internet). Any tunneling service you want will work, but for this example we'll use `fedify tunnel`.

The Fedify project provides a free and open source CLI tool for fediverse developers with a lot of nice functionality including a `tunnel` command that takes a process running on a local port and exposes it via an HTTPS URL. You can install via npm:

```bash
npm install -g @fedify/cli
```

Then you can run it to expose your local Fuzzer server running on port 3000:

```bash
fedify tunnel 3000
```

### Install the server

- `git clone git@github.com:berkmancenter/activitypub-fuzzer.git`
- `cd activitypub-fuzzer`
- `npm i`

### Download the lastest Fediverse Schema Observatory data

- download the latest [Fediverse Schema Observatory database snapshot](https://observatory.cyber.harvard.edu/snapshots/) and include it in the root directory of the project as `observatory.db`

### Configure the server

- copy `.env.example` to `.env`
- edit `.env` to set the following variables:
   - `DEFAULT_TARGET_ENDPOINT`: the URL of an ActivityPub inbox you want the Fuzzer to send activities to, e.g. `https://myserver.example/users/alice/inbox`
   - `ACCOUNT`: the account name of the main account on the Fuzzer, e.g. `fuzzer`
   - `DOMAIN`: the domain name of the Fuzzer as exposed by the tunneling service, without `https://`, e.g. `fuzzer.example` (if using a tunneling service like ngrok, this will be something like `abcd1234.ngrok.io`)
   - `PORT`: the port number to run the Fuzzer on, e.g. `3000`
   - `ACTOR_DISPLAY_NAME`: the display name of the main account on the Fuzzer, e.g. `Fuzzer`
   - `ACTOR_DESCRIPTION`: a short description of the main account on the Fuzzer, e.g. `A fuzzer for ActivityPub`, which will appear in the main fuzzer account profile if you fetch it
   - `ACTOR_AVATAR`: a URL to an image to use as the avatar for the main account on the Fuzzer, e.g. `https://example.com/avatar.png`

### Run your reverse proxy and the server

- `fedify tunnel 3000` (or start your tunneling service of choice, use PORT defined above)
- `npm start`

You should see a message like:

```bash
Server is running on http://localhost:3000
Connected to the SQLite database.
Connected to the SQLite database.
Messages table created successfully.
Accounts table created successfully.
Record created for primary Fuzzer ActivityPub Actor and webfinger
Actor ID: https://fuzzer.example/u/fuzz
Webfinger uri: https://fuzzer.example/.well-known/webfinger?resource=acct:fuzz@fuzzer.example
```

If you go to whatever URL your tunneling service provided (e.g. `https://abcd1234.ngrok.io`), you should see the Fuzzer website, and if you go to the two URLs printed above, you should see the ActivityPub actor JSON and the webfinger JSON.

### Using the Fuzzer

At this point, the Fuzzer is running and you can:

 - put `@fuzz@fuzzer.example` in the user search for most Fediverse software and discover the Fuzzer's main actor account
 - set the Fuzzer's target inbox URL to whatever you want, probably the inbox of an account on your own server you're developing and would like to test against mocked data
 - use the web interface to send messages from every known version of a specific Fediverse software project to your target inbox
 - use the web interface to send messages from a mocked public fire hose of all known Fediverse software to your target inbox. This is a great way to test how well your software handles a wide variety of ActivityPub messages. The fire hose is statistically distributed to be similar to what you'd see on a public fire hose -- for example, there will be more Mastodon Create(Note) activities than Pleroma Create(Note) activities, because Mastodon messages comprise a larger share of the Fediverse.
 - use the web interface to 

### Features to come

If there's a feature you'd like this to have, please open an issue or a pull request!
 Right now I mostly want to prioritize issues from users, but am also planning to add:

 - More message types
 - Adding a log to the web interface showing what messages have been sent so you can compare and debug
