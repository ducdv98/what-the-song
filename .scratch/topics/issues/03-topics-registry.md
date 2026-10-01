# Add @wts/topics and use it in API and web

Status: ready-for-agent
Blocked by: 02

Create the registry package exporting every Topic by id. API validates a reported Topic id against it; web resolves a Topic from it. Add the web renderer registry keyed by Topic id (Songs renderer only).

## Done when
- Adding a Topic needs one new package plus one registry line and one renderer entry.
- An unknown Topic id is rejected by the API with a typed error.
