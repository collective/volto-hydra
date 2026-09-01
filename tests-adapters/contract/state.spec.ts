import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { resolveTarget, type Target } from '../targets';

let target: Target;

beforeAll(async () => {
  target = await resolveTarget();
  await target.start();
});

afterAll(async () => {
  await target.stop();
});

beforeEach(async () => {
  await target.seed();
});

const PATH = '/about';

const advertises = (capability: string) =>
  target.adapter.capabilities.includes(capability as never);

/**
 * The state menu, and what each entry asks for before it fires.
 *
 * Split across two intents on purpose. `state.get` is on the hot path — Plone's
 * `@actions` maps to it and the admin requests that on every content view — so
 * it stays cheap: ids and labels. `state.getForms` is fetched once when the
 * menu opens, and returns every transition's form together because the
 * expensive part, the current grants, is shared between them.
 */
describe('state.get', () => {
  it('returns the canonical shape', async () => {
    if (!advertises('state')) return;
    const pas: any = await target.adapter.dispatch('state.get', { path: PATH });

    expect(typeof pas.state.name).toBe('string');
    expect(pas.state.name.length).toBeGreaterThan(0);
    expect(typeof pas.state.label).toBe('string');

    expect(Array.isArray(pas.transitions)).toBe(true);
    const ids = new Set<string>();
    for (const t of pas.transitions) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.label).toBe('string');
      expect(typeof t.targetState).toBe('string');
      // Ids address the entry; a duplicate silently overrides its twin.
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
    }

    for (const flag of ['canEdit', 'canPublish', 'canDelete', 'canShare']) {
      expect(typeof pas.effective[flag]).toBe('boolean');
    }
  });

  it('does not offer a transition it says the user cannot make', async () => {
    if (!advertises('state')) return;
    const pas: any = await target.adapter.dispatch('state.get', { path: PATH });

    // The suite runs as an administrator, so this is not a vacuous pass: it
    // catches `effective` being derived from the wrong place — hardcoded, or
    // read from a response key that does not exist — in either direction. A
    // false canPublish beside a Publish transition disables the button the
    // menu is offering; a true one puts a button in front of a Contributor
    // that the CMS then refuses.
    const publishes = pas.transitions.filter((t: any) =>
      ['published', 'public'].includes(t.targetState),
    );
    if (publishes.length) expect(pas.effective.canPublish).toBe(true);
  });

  it('offers a transition that actually moves the document', async () => {
    if (!advertises('state')) return;
    const before: any = await target.adapter.dispatch('state.get', { path: PATH });
    const move = before.transitions[0];
    // A document with nowhere to go is a legitimate state, but not for the
    // seed's /about — if this is empty the adapter is not reading permissions.
    expect(move).toBeDefined();

    await target.adapter.dispatch('state.transition', {
      path: PATH,
      id: move.id,
    });

    const after: any = await target.adapter.dispatch('state.get', { path: PATH });
    expect(after.state.name).toBe(move.targetState);
  });

  it('rejects cleanly where the capability is absent', async () => {
    if (advertises('state')) return;
    await expect(
      target.adapter.dispatch('state.get', { path: PATH }),
    ).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
  });
});

describe('state.getForms', () => {
  it('answers for every transition state.get offered', async () => {
    if (!advertises('state')) return;
    const pas: any = await target.adapter.dispatch('state.get', { path: PATH });
    const forms: any = await target.adapter.dispatch('state.getForms', {
      path: PATH,
    });

    for (const t of pas.transitions) {
      // A transition the menu can show but not open is a dead entry.
      expect(forms[t.id]).toBeDefined();
    }
  });

  it('returns a renderable schema and its current values', async () => {
    if (!advertises('state')) return;
    const forms: any = await target.adapter.dispatch('state.getForms', {
      path: PATH,
    });

    for (const [id, form] of Object.entries<any>(forms)) {
      expect(Array.isArray(form.schema.fieldsets), `${id} fieldsets`).toBe(true);
      expect(typeof form.schema.properties, `${id} properties`).toBe('object');
      expect(Array.isArray(form.schema.required), `${id} required`).toBe(true);
      expect(typeof form.data, `${id} data`).toBe('object');

      // Every fieldset's fields must exist as properties, or the renderer
      // draws a legend over nothing.
      for (const fieldset of form.schema.fieldsets) {
        for (const field of fieldset.fields) {
          expect(form.schema.properties[field], `${id}.${field}`).toBeDefined();
        }
      }

      // Values the schema cannot describe cannot be rendered or sent back.
      for (const key of Object.keys(form.data)) {
        expect(form.schema.properties[key], `${id} data key ${key}`).toBeDefined();
      }
    }
  });

  it('offers an access-only form exactly where per-document grants exist', async () => {
    if (!advertises('state')) return;
    const forms: any = await target.adapter.dispatch('state.getForms', {
      path: PATH,
    });

    if (!advertises('per-content-permissions')) {
      // Not a shortcoming to paper over: a CMS whose permissions are site-wide
      // has nothing to offer here, and an empty people list would read as
      // "nobody has access" rather than "not answered here".
      expect(forms.access).toBeUndefined();
      return;
    }

    expect(forms.access).toBeDefined();
    const props: any = forms.access.schema.properties;
    const roleFields = Object.entries<any>(props).filter(
      ([, p]) => p.vocabulary === 'principals',
    );
    // One field per role, not a permission matrix.
    expect(roleFields.length).toBeGreaterThan(0);
    for (const [name, prop] of roleFields) {
      expect(typeof prop.title, `${name}.title`).toBe('string');
      // The description is what makes a role name mean something — "will be
      // able to update when published" — and no CMS volunteers it.
      expect(typeof prop.description, `${name}.description`).toBe('string');
      expect(prop.description.length).toBeGreaterThan(0);
    }
  });

  it('rejects cleanly where the capability is absent', async () => {
    if (advertises('state')) return;
    await expect(
      target.adapter.dispatch('state.getForms', { path: PATH }),
    ).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
  });
});
