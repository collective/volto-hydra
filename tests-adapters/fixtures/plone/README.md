# Plone response shapes

Recorded HTTP responses from a real Plone, taken from plone.restapi's own
`src/plone/restapi/tests/http-examples/`. Same role as
`tests-adapters/fixtures/drupal/` and `capture/capture-drupal.sh`: the SHAPES
come from a real backend, the mock simulates BEHAVIOUR around them. Upstream
regenerates these from live tests, so they are a capture we did not have to run
a Plone to take.

What they settle, that guessing would have got wrong:

- **`@workflow` transitions carry no destination state.** Each is `{"@id":
  ".../@workflow/publish", "title": "Publish"}` and nothing more. Current state
  comes back separately as `state: {id, title}`. This is why `targetState` is
  optional in the contract.
- **`@workflow` POST already takes a body**: `comment`, `effective`, `expires`,
  `include_children`. The transition-schema design is not inventing a
  mechanism, it is exposing one Plone already has.
- **`@sharing` is entry-major** — `entries[].roles` is a `{Role: bool}` map —
  so role-major fields are the adapter's transposition, in both directions.
- **`available_roles[].title` is already a phrase**, not a role name: "Can
  view", "Can edit", "Can add", "Can review".
- `disabled` on an entry marks a role held by acquisition rather than locally.
