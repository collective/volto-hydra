/**
 * Render canonical adapter results in the shape Volto's reducers parse.
 *
 * The routing half of this pair turns Plone-shaped requests into canonical
 * intents; without this half the answers come back in the wrong shape and every
 * reducer downstream breaks. Volto's ~40 reducers are the part we are
 * deliberately not rewriting, so the canonical result is translated once, here,
 * rather than teaching each of them a second vocabulary.
 *
 * `@id` is emitted as a bare path. flattenToAppURL() strips a configured
 * apiPath prefix when present and otherwise returns its input untouched, so a
 * path survives it unchanged — which is what every component wants anyway.
 */

/** Plone marks folderishness explicitly; canonical Documents imply it. */
const isFolderish = (doc) =>
  doc.fields?.isFolderish ?? ['Folder', 'Plone Site', 'page'].includes(doc.type);

export function documentToPlone(doc) {
  if (!doc) return doc;
  const { blocks, blocksLayout, fields, _adapter, id, path, type, title, state, ...rest } = doc;
  return {
    ...fields,
    ...rest,
    '@id': path,
    '@type': type,
    id: path.split('/').filter(Boolean).pop() ?? '',
    UID: id,
    title,
    blocks: blocks ?? {},
    blocks_layout: blocksLayout ?? { items: [] },
    ...(state !== undefined ? { review_state: state } : {}),
    is_folderish: isFolderish(doc),
  };
}

/** Listings, search and folder contents share one envelope in Plone. */
function resultsToPlone(result, path) {
  const items = (result?.items ?? []).map(documentToPlone);
  return {
    '@id': path,
    items,
    items_total: result?.total ?? items.length,
    batching: result?.batching ?? {},
  };
}

function indexesToPlone(indexes) {
  // Volto's query builder reads `indexes` for the dropdown and
  // `sortable_indexes` for the sort-on select; they are separate maps.
  const sortable = {};
  for (const [name, idx] of Object.entries(indexes ?? {})) {
    if (idx.sortable) sortable[name] = { title: idx.title };
  }
  return { indexes: indexes ?? {}, sortable_indexes: sortable };
}

function permissionsToPlone(pas) {
  // Volto's @workflow endpoint returns the transitions list plus the current
  // state; history is a Plone-only affordance and is legitimately empty here.
  return {
    '@id': '',
    history: [],
    transitions: (pas?.transitions ?? []).map((t) => ({
      '@id': t.id,
      title: t.label,
      new_state_id: t.targetState,
    })),
    state: pas?.state?.name,
  };
}

/**
 * Volto's toolbar and contents view read @actions to decide which controls to
 * show. Derive them from the canonical permissions rather than asking adapters
 * to model Plone's action registry.
 */
function actionsToPlone(pas) {
  const e = pas?.effective ?? {};
  const object = [{ id: 'view', title: 'View' }];
  if (e.canEdit) object.push({ id: 'edit', title: 'Edit' });
  if (e.canEdit) object.push({ id: 'folderContents', title: 'Contents' });
  if (e.canDelete) object.push({ id: 'delete', title: 'Delete' });
  if (e.canShare) object.push({ id: 'sharing', title: 'Sharing' });
  return { object, object_buttons: [], user: [], site: [] };
}

export function plonify(intent, result, { path, endpoint } = {}) {
  if (endpoint === 'actions') return actionsToPlone(result);
  switch (intent) {
    case 'content.get':
    case 'content.update':
    case 'content.create':
    case 'content.move':
      return documentToPlone(result);

    case 'content.delete':
      return result ?? {};

    case 'search':
    case 'tree.list':
    case 'querystringSearch':
      return resultsToPlone(result, path);

    case 'types.getSchema':
      return result;

    case 'types.list':
      // Canonical listings are always {items}, never a bare array — Volto's
      // types reducer stores the response as-is and the toolbar maps over it.
      return (result?.items ?? []).map((t) => ({
        '@id': `/@types/${t.id}`,
        id: t.id,
        title: t.title,
        addable: t.addable ?? true,
      }));

    case 'querystring.getIndexes':
      return indexesToPlone(result);

    case 'auth.whoami':
      return { '@id': `/@users/${result?.id}`, ...result };

    case 'vocabulary.get':
      return {
        '@id': path,
        items: result?.items ?? [],
        items_total: result?.total ?? (result?.items ?? []).length,
      };

    case 'breadcrumbs.get':
      return {
        '@id': path,
        items: (result?.items ?? []).map((i) => ({ '@id': i.path, title: i.title })),
      };

    case 'navigation.get':
      return {
        '@id': path,
        items: (result?.items ?? []).map(function toItem(i) {
          return {
            '@id': i.path,
            title: i.title,
            ...(i.items ? { items: i.items.map(toItem) } : {}),
          };
        }),
      };

    case 'state.get':
    case 'state.transition':
      return permissionsToPlone(result);

    default:
      return result;
  }
}

export default plonify;
