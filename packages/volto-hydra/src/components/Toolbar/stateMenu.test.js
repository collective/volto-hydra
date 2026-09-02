import { describe, it, expect } from 'vitest';
import { menuEntriesFrom } from './stateMenu';

const forms = {
  publish: { schema: { fieldsets: [], properties: { comment: {} }, required: [] }, data: {} },
  retract: { schema: { fieldsets: [], properties: {}, required: [] }, data: {} },
  access: {
    schema: { fieldsets: [], properties: { Reader: { vocabulary: 'principals' } }, required: [] },
    data: { Reader: ['alice'] },
  },
};

describe('menuEntriesFrom', () => {
  it('lists a transition per available move, with its form attached', () => {
    const entries = menuEntriesFrom(
      { state: { name: 'private' }, transitions: [{ id: 'publish', label: 'Publish' }] },
      forms,
    );
    expect(entries.map((e) => e.id)).toEqual(['publish', 'access']);
    expect(entries[0].schema.properties.comment).toBeDefined();
  });

  it('drops a transition that leads where we already are', () => {
    // The design's rule: choosing the current state does nothing, so offering
    // it invites a click that cannot have an effect.
    const entries = menuEntriesFrom(
      {
        state: { name: 'published' },
        transitions: [
          { id: 'publish', label: 'Publish', targetState: 'published' },
          { id: 'retract', label: 'Retract', targetState: 'private' },
        ],
      },
      forms,
    );
    expect(entries.map((e) => e.id)).toEqual(['retract', 'access']);
  });

  it('keeps a transition that cannot say where it leads', () => {
    // Plone names no destination. Dropping those would empty its menu.
    const entries = menuEntriesFrom(
      { state: { name: 'private' }, transitions: [{ id: 'publish', label: 'Publish' }] },
      forms,
    );
    expect(entries.map((e) => e.id)).toContain('publish');
  });

  it('offers access separately, and only when the CMS has it', () => {
    const withAccess = menuEntriesFrom({ state: { name: 'x' }, transitions: [] }, forms);
    expect(withAccess.map((e) => e.kind)).toEqual(['access']);

    const without = menuEntriesFrom({ state: { name: 'x' }, transitions: [] }, { publish: forms.publish });
    expect(without).toEqual([]);
  });

  it('says which entries will ask something before they fire', () => {
    // Drives the dialog: an entry with nothing to ask is a sentence and a
    // confirm, not an empty form.
    const entries = menuEntriesFrom(
      {
        state: { name: 'private' },
        transitions: [
          { id: 'publish', label: 'Publish' },
          { id: 'retract', label: 'Retract' },
        ],
      },
      forms,
    );
    expect(entries.find((e) => e.id === 'publish').asks).toBe(true);
    expect(entries.find((e) => e.id === 'retract').asks).toBe(false);
  });

  it('survives a transition the adapter offered no form for', () => {
    const entries = menuEntriesFrom(
      { state: { name: 'private' }, transitions: [{ id: 'mystery', label: 'Mystery' }] },
      forms,
    );
    expect(entries.find((e) => e.id === 'mystery').asks).toBe(false);
  });
});
