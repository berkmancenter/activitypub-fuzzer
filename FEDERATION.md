# Federation

This document is a FEDERATION.md specification per [FEP-67ff](https://codeberg.org/fediverse/fep/src/branch/main/fep/67ff/fep-67ff.md). It is a prose document meant to aid developers in understanding how this software federates.

## Supported federation protocols and standards

- [ActivityPub](https://www.w3.org/TR/activitypub/) (Server-to-Server)
- [WebFinger](https://webfinger.net/)
- [Http Signatures](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures)
- [NodeInfo](https://nodeinfo.diaspora.software/)

## Document conventions

 - A `guid` is a pseudorandomly-generated 32-character hexadecimal string like `0123456789abcdef0123456789abcdef`.
 - `fuzzer.example` is the placeholder name for the domain of the Fuzzer. See `README.md` for configuration details and recommendations for reverse proxy

## ActivityPub

Individual `Object` ids are formatted `https://fuzzer.example/m/${guid}` and can be dereferenced at the URL.

An `Activity` that wraps an object has the id `https://fuzzer.example/m/${guid}/activity` and can be dereferenced at the URL. So far the Fuzzer only generates one `Activity` per `Object`; if this changes there might be an addition of something like `https://fuzzer.example/m/${guid}/activity/${activity-guid}` for additional activities.

Additionally, the Fuzzer only supports `Create` activities for now, so the `type` of the activity is always `Create`. `Announce`, `Delete`, and `Update` will be added in the near future, but they require a little more state management (e.g. keeping track of which objects have been announced, deleted, or updated). `Follow`, `Accept`, `Reject`, and `Undo` are typically not collected by the [Observatory](https://observatory.cyber.harvard.edu/) because they are not publicly broadcast events, but I'm considering adding a way for developers to manually drop in URIs of persistent activities of these type to be added to the Observatory's collection.

Making a GET request to the URL `https://fuzzer.example/u/${ANYUSER}` will create a new user with the username `${ANYUSER}` if it does not already exist, along with an associated webfinger record at `https://fuzzer.example/.well-known/webfinger?resource=acct:${ANYUSER}@fuzzer.example`. This user is also discoverable as `@ANYUSER@fuzzer.example`.

If you POST a `Follow` activity to `https://fuzzer.example/inbox`, the Fuzzer will respond with an `Accept` activity, but this is a "dummy" response: no records will will be updated as a side effect; followers collections are not updated on any accounts on the Fuzzer. At the moment the only truly "followable" account on the Fuzzer is the main one defined in the `ACCOUNT` environment variable defined in the `.env` file (see `README.md` for more on that file), and even then it doesn't keep track of follower records.
