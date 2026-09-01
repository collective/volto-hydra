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

1. **Roles instead of permission tuples** is a breaking change to
   `PermissionsAndState`. Nothing depends on the current shape yet, so the cost
   is now or never.
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
