/**
 * The state menu: one list of things that change what this document is and who
 * can reach it.
 *
 * Plone keeps workflow, sharing and working copies in three separate screens.
 * They answer one question — who can do what, when — so they are one list here,
 * and every entry opens a dialog that says what it will do before it does it.
 *
 * Pure, so the rules below are testable without mounting a toolbar.
 */

/** Changing who can reach this without moving it. Reserved id in the contract. */
export const ACCESS_ID = 'access';

/**
 * @param {object} pas - PermissionsAndState from `state.get`
 * @param {object} forms - TransitionForms from `state.getForms`
 */
export function menuEntriesFrom(pas, forms) {
  const current = pas?.state?.name;

  const entries = (pas?.transitions ?? [])
    // A transition to where we already are cannot have an effect, so offering
    // it invites a click that does nothing. Kept when the adapter cannot say
    // where it leads — Plone's @workflow names no destination, and dropping
    // those would empty its menu entirely.
    .filter((t) => t.targetState === undefined || t.targetState !== current)
    .map((t) => entry(t.id, t.label, 'transition', forms));

  if (forms?.[ACCESS_ID]) {
    entries.push(
      entry(ACCESS_ID, 'Change who can access…', 'access', forms),
    );
  }

  return entries;
}

function entry(id, label, kind, forms) {
  const form = forms?.[id];
  const properties = form?.schema?.properties ?? {};
  return {
    id,
    label,
    kind,
    schema: form?.schema ?? null,
    data: form?.data ?? {},
    // Nothing to ask means the dialog is a sentence and a confirm rather than
    // an empty form. An adapter that offered no form at all lands here too.
    asks: Object.keys(properties).length > 0,
  };
}
