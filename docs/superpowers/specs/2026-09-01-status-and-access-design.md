# Status and access, in one place

**Status:** design. Nothing here is built. The capability vocabulary and
`PermissionsAndState` exist; no adapter advertises `per-content-permissions`
today, so the sharing half is hidden on all three CMSes and `shareEntries` is
`null` everywhere.

## Short version

Plone's state menu, except:

- it is in **view mode as well as edit mode**, so publishing does not require
  editing;
- a transition does not fire immediately — it opens a dialog naming what the
  change does to who can see this, with people and roles underneath;
- the list carries **working-copy transitions** too, since checking out a copy
  is a state change;
- and an **access-only entry**, for changing permissions without moving state.

Dates belong here too: "published" is not the truth when an effective date puts
it next week, so status is always shown as the audience that actually applies.

Save stays its own one-tap button. Choosing the current state does nothing.

## The problem

Plone puts three answers to one question in three places: the workflow menu,
the sharing tab, and a working-copy entry in an overflow menu. They are not
three questions. They are "who can see and do what with this, and which
version of it" asked at different resolutions.

In Plone this is literally true rather than an analogy: **a workflow state IS a
role → permission map.** "Published" means the Anonymous role holds View;
"private" means only Owner and Manager do. The state machine does not sit
beside permissions, it switches them wholesale. Local roles are per-principal
exceptions layered on top.

So:

| | granularity |
| --- | --- |
| State | coarse, named, pre-set bundles over *classes* of principal |
| Sharing | fine, per-principal exceptions |

Google Drive collapses the two because for a single document the useful
vocabulary is audience — *Restricted* / *Anyone with the link*, plus what
link-holders may do. That is a state and a role in one control.

## What each CMS actually has

Not one scale but three independent axes: whether grants attach to *this
document* or the whole site, which principals exist, and whether anything is
inherited.

| | scope | principals | inheritance | working copy |
| --- | --- | --- | --- | --- |
| **Plone** | per-object local roles | users, groups, roles | acquired, with a per-object block | yes — `plone.app.iterate`, locked to one holder |
| **WordPress** core | site-wide roles only | users, one role each | none | **no** — revisions are history; no draft of a published post |
| **Drupal** core | site-wide roles only | users, roles | none | yes — Content Moderation pending revisions, not per-user |
| **Drupal** + contrib | per-node (Node Access, ACL) | + groups (Group module) | module-defined | Workspaces stages a whole site |

WordPress is the one that genuinely lacks concepts, not one that spells them
differently. That is what the design has to degrade to.

## Shape

### Drive-style, not a grid

All three CMSes think in **named roles** — Plone's Reader/Editor/Contributor/
Reviewer, WordPress's Subscriber→Administrator, Drupal's roles. A permission
matrix is a shape none of them speaks; we would invent it, map each CMS into
it, and map back on save.

This is a contract change. Today a grant is a permission tuple:

```ts
permissions: Array<'read' | 'edit' | 'publish' | 'delete'>;   // grid-shaped
```

Drive-style wants one role per principal, plus the CMS's own assignable roles
so the control is adapter-driven rather than hardcoded:

```ts
assignableRoles: Array<{ id: string; label: string }>;
entries: Array<{ principal; role: string; inherited: boolean; inheritedFrom?: string }>;
```

**The lossy case, to be handled rather than hidden:** Plone allows a principal
to hold several local roles at once and a single select cannot say that. Drive
answers this with **Custom** — show the role name when the underlying set maps
to one, "Custom" with detail when it does not, editable only by replacing it.
What must not happen is silently collapsing two roles into one and writing that
back, quietly removing access nobody asked to remove.

### One dialog, two halves

- **People with access** — principals and roles, from `shareEntries`. Group
  rows appear because the adapter returned groups, not because of a separate
  capability, so a CMS without groups degrades by having none.
- **General access** — the audience the current state implies. This is where
  the workflow half lives, in Drive's idiom rather than as a separate panel.

Gating:

| section | requires |
| --- | --- |
| State, transitions, "what you can do here" | nothing — every CMS answers |
| People with access | `per-content-permissions` |
| Inherited-from markers, "stop inheriting" | `hierarchical-permissions` |
| Editable vs read-only sharing | `effective.canShare` |
| Add-a-person typeahead | a principal `vocabulary` |

**Degrade to a route, not to emptiness.** WordPress has permissions; they are
site-wide. Hiding the section leaves a real question with no answer, so it
becomes a delegation line — *"Permissions in WordPress are site-wide — Open
Users in WordPress →"* — using the native toolbar actions already built.

### Saving is where state changes

Two of the three CMSes change state at save natively and in one request:
WordPress's *Save draft / Publish / Update*, Drupal's *Save as: Draft |
Published*. Plone's separate transition exists because the person who edits may
not be the person who approves — a reviewer publishing someone else's work has
nothing to save.

Both are needed; the default should be the common one.

- **The primary button states its own consequence** — *Save draft* on a
  private page, **Update live page** on a published one. That carries the
  warning WordPress omits (it gates the first publish but not the update that
  changes what the public sees) without a confirmation step on every save.
- **A state change must travel WITH the save.** Publishing while the form holds
  unsaved edits would publish the *old* content — the user sees "Published" and
  the live page still shows yesterday's text. So `content.update` takes an
  optional transition, applied atomically. WordPress and Drupal do it in the
  single request they would do natively; Plone's adapter saves then transitions
  behind the same intent.
- **Sharing does not ride on save.** It has no relationship to the unsaved
  body. It applies immediately — except when reached from the save flow, where
  committing applies both.

### The control

**No caret on Save.** This toolbar is a row of icon buttons with a full-screen
sheet on mobile; a caret is a second, smaller target glued to a primary one.

The state gets **its own toolbar button** showing the current state, opening a
slide-out (a sheet on mobile, with full-size rows). Save stays one tap that
does one thing. As a separate button it is reachable while *not* editing, which
is the reviewer's path — you should not have to edit something to publish it.

The slide-out is a list of **outcomes**, not states:

```
[ Update live page ]   [ Published ▸ ]      ← two buttons, not one with a caret

   Published            (current)
   Save as draft         keep the live page, work on a copy
   Submit for review     Alice can see and approve it
   Unpublish             remove it from the site
   Change who can access…
```

Choosing anything other than the current state opens the dialog, which names
the target and explains the consequence before committing. The dialog does not
repeat the state list — the slide-out is where the state is chosen; showing it
twice invites "which of these is authoritative?".

**"Draft" is ambiguous on a published page and the two meanings are
opposites**: retract takes the page off the site; a working copy leaves it
exactly as it is. Both exist in Plone. Labelled by consequence, a user cannot
mistake one for the other.

### When: dates are part of the audience

Audience has a time dimension and all three CMSes express it, so the dialog
carries it rather than leaving it to a metadata tab nobody opens.

| | publish at | stop publishing at |
| --- | --- | --- |
| **WordPress** | scheduled publish (`future` status) | — |
| **Plone** | effective date | expiration date |
| **Drupal** | contrib (Scheduler), not core | contrib |

Plone's is the awkward one and the reason this cannot be left out: effective
and expiration are a **second visibility mechanism running alongside
workflow**. A document can be `published` and still invisible because its
effective date is next week — Plone's own UI will cheerfully show "Published"
while the page 404s for anonymous.

So: **the state name is not the truth, the effective audience is.** Anywhere
this design shows a status — the toolbar button, the slide-out, the dialog —
it shows what is actually true now, with the date as the qualifier:

```
Published — from Tuesday 9 Sept        (not yet visible)
Published — until 30 Sept
```

A scheduled change is the same transition with a date attached, so it needs no
special case in the contract: the date is a field on the publish transition's
schema (below), and the save flow reads *Save & publish on Tuesday*. Where a
CMS has no expiry the field is simply not in the schema, on the same principle
as every other capability gate: absent, not empty and inert.

### Working copies are transitions

Checking out a copy *is* a state change, so it needs no separate concept:
adapters that support it simply offer more transitions — *Save as draft*,
*Publish draft*, *Discard draft* — in the same list. Drupal maps them to
moderation states, Plone to `iterate` check-out/check-in, WordPress offers
none and the list is shorter.

Semantics, stated neutrally so no adapter has to lie:

- The version you get **depends on what you are doing**: view resolves to
  published, edit resolves to the draft. `content.get` must carry which
  resolution is wanted; today it takes a path and returns *the* document.
- There is **one** draft ahead of the published version. Drupal accumulates
  many draft *revisions* but only the latest is editable; Plone allows one
  working copy at a time.
- **Exclusivity is Plone's, not everyone's.** Plone locks the copy to whoever
  checked it out; a Drupal pending revision is visible and editable by anyone
  with the permission. So the model says *"a draft ahead of the published
  version, held by ⟨principal⟩ or by no one"*, with locking as a separate thing
  Plone advertises. "Your draft" would make Drupal misrepresent shared drafts
  as personal ones.
- **A transition can redirect the editing session.** Ordinary transitions
  change this document's state; check-out produces a second object and moves
  editing onto it. `state.transition` must be able to reply "you are now
  editing ⟨id⟩" or the button appears to do nothing.
- Drupal **Workspaces** is the case that breaks "one draft". It belongs as
  session context — an active workspace, like a branch, changing what every
  path resolves to — not as an array of drafts per document.

### A transition may ask for more than confirmation

Publishing is rarely just publishing. WordPress wants a date, a visibility and
maybe a password; Drupal wants a revision log message; Plone wants effective
and expiration dates. There is no closed set of these and no reason to invent
one, so **a transition carries an optional schema of what may be set when
taking it**:

```ts
transitions: Array<{
  id: string;
  label: string;
  targetState: string;

  /** Structured — the dialog explains before it fires. */
  consequence?: {
    gains: Array<{ id: string; label: string }>;   // 'anonymous', 'Marketing'
    loses: Array<{ id: string; label: string }>;
  };

  /** Anything else settable as part of this transition. Rendered with the
   *  same form component as the sidebar. The adapter validates; the admin
   *  passes values back untouched. */
  schema?: Schema;
}>;
```

and `state.transition` takes `{ path, transition, data }`.

`Schema` is the type the contract already has, so this adds no machinery: the
same renderer that draws the sidebar draws the dialog's lower half. Two further
properties fall out rather than needing design. Transitions are already
computed per object per user inside `state.get`, so a schema is automatically
per *(object, user, transition)* — publishing from `draft` can ask for
different fields than publishing from `pending`. And WordPress's pre-publish
panel stops being a special case we hardcode; it is just the schema its adapter
emits.

| transition | schema |
| --- | --- |
| WordPress publish | `date`, `visibility`, `password`, `slug` |
| Drupal publish (Content Moderation) | `revision_log`, plus `publish_on` where Scheduler is installed |
| Plone publish | `effective`, `expires`, `comment` |
| Plone check out | none — the dialog is the sentence and a confirm |

**Two things stay out of the schema**, and the boundary matters more than the
mechanism:

*Consequence is not a schema.* The reason this beats Plone's three screens is
that it says "this makes it visible to anyone" **before** you commit. A list of
fields cannot produce that sentence. Let the schema swallow the whole dialog
and we have rebuilt Plone's publish form with extra steps.

*People are not a form field.* The list with search, a role per row and
inherited rows greyed is a bespoke widget. It could be expressed as a field
with `widget: 'shareEntries'`, but then the schema carries a widget name only
one implementation understands — the general mechanism smuggling a specific one
back in — and the admin loses the ability to reason about grants at all: no "3
people" on the toolbar button, no diff, no explanation.

So: **structured for state and access, schema for everything hanging off a
transition.**

### Say what a role does in the state it is in

"Reviewer" is meaningless in `published` and decisive in `pending`, and no CMS
tells you so; you are expected to know the workflow definition.

> **Alice — Reviewer.** Can approve this while it is *pending*. No effect once
> published.

This needs a projection the contract does not carry: **state → role → what it
enables**. Plone can compute it exactly, because that mapping *is* its workflow
definition. Drupal can partially. WordPress cannot — roles do not vary by
status — so it degrades to "Editor — can edit anything on this site", still
truer than a role name with no consequence.

It earns its keep twice: the same projection writes the sentence in the
slide-out explaining what a transition will change about who can see this.

## Open questions

1. **Two changes to `PermissionsAndState`, both breaking, both free today.**
   Grants become named roles rather than permission tuples, and transitions
   gain `consequence` and `schema`. Nothing consumes either field — WordPress
   and Drupal return `shareEntries: null`, Plone does not implement
   `permissions.get` at all — so the cost is now or never.
2. **Which adapter lights it up first.** Plone is the only one that can express
   per-content grants, groups and inheritance — and implementing
   `permissions.get`/`update` there makes the contract suite's existing
   `sharing` probe start holding it to account.
3. **Drupal draft transitions cannot be tested as things stand.** The harness
   runs a captured mock that knows nothing about moderation states or
   revisions; fixtures would need re-capturing against a real Drupal with
   Content Moderation enabled. This is the §2.1 mock-drift risk, which already
   bit once when the adapter and the mock disagreed about sorting.
4. **Whether the sharing half applies immediately in edit mode** while state is
   deferred to the save. Recommended, since access does not depend on the body
   — but the dialog must say which half is which rather than leave it inferred.
