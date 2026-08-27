/**
 * Translate Volto's Plone-shaped requests into canonical intents.
 *
 * Volto's ~30 action creators emit raw Plone REST paths — /@types/Document,
 * /@querystring, /@search?path.depth=1. Carried verbatim over the `http`
 * passthrough they only mean anything to a Plone adapter, so on WordPress or
 * Drupal every call fails and the CMS is never contacted.
 *
 * Rewriting every action creator is the alternative; routing here is not. This
 * is the single point every admin request already passes through, so one
 * translation table serves all of them, and the action creators stay untouched.
 *
 * Returns null when a path has no semantic equivalent — the caller then falls
 * back to the passthrough, which is exactly what Plone wants anyway.
 */

const stripQuery = (path) => String(path).split('?')[0];

function queryOf(path) {
  const q = String(path).split('?')[1];
  return new URLSearchParams(q || '');
}

/** Volto addresses content by path; everything after the last @foo is the verb. */
function splitEndpoint(path) {
  const clean = stripQuery(path);
  const at = clean.lastIndexOf('/@');
  if (at === -1) return { contextPath: clean || '/', endpoint: null, rest: [] };
  const contextPath = clean.slice(0, at) || '/';
  const [endpoint, ...rest] = clean.slice(at + 2).split('/');
  return { contextPath, endpoint, rest };
}

export function routeToIntent({ op, path, data }) {
  const { contextPath, endpoint, rest } = splitEndpoint(path);
  const params = queryOf(path);

  // Plain content operations: no @endpoint at all.
  if (!endpoint) {
    if (op === 'get') return { intent: 'content.get', args: { path: contextPath } };
    if (op === 'patch') {
      const { blocks, blocks_layout: blocksLayout, ...fields } = data ?? {};
      return {
        intent: 'content.update',
        args: {
          path: contextPath,
          data: {
            ...fields,
            ...(blocks !== undefined ? { blocks } : {}),
            ...(blocksLayout !== undefined ? { blocksLayout } : {}),
          },
        },
      };
    }
    if (op === 'post') {
      return {
        intent: 'content.create',
        args: {
          parentPath: contextPath,
          data: {
            type: data?.['@type'],
            title: data?.title,
            blocks: data?.blocks,
            blocksLayout: data?.blocks_layout,
          },
        },
      };
    }
    if (op === 'del') return { intent: 'content.delete', args: { path: contextPath } };
    return null;
  }

  switch (endpoint) {
    case 'types':
      return rest.length
        ? { intent: 'types.getSchema', args: { type: decodeURIComponent(rest[0]) } }
        : { intent: 'types.list', args: {} };

    case 'querystring':
      return { intent: 'querystring.getIndexes', args: {} };

    case 'querystring-search':
      return {
        intent: 'querystringSearch',
        args: {
          query: data?.query ?? [],
          sortOn: data?.sort_on,
          sortOrder: data?.sort_order,
          limit: data?.b_size,
        },
      };

    case 'users':
      // Volto asks for a specific user, but the only one it ever needs in the
      // editor is the current session's.
      return { intent: 'auth.whoami', args: {} };

    case 'search': {
      // path.depth=1 is a folder listing, not a search — the contents view and
      // the object browser both use it that way.
      if (params.get('path.depth') === '1') {
        return { intent: 'tree.list', args: { parent: contextPath } };
      }
      return {
        intent: 'search',
        args: {
          query: params.get('SearchableText') ?? undefined,
          path: contextPath === '/' ? undefined : contextPath,
          limit: params.get('b_size') ? Number(params.get('b_size')) : undefined,
        },
      };
    }

    case 'breadcrumbs':
      return { intent: 'breadcrumbs.get', args: { path: contextPath } };

    case 'navigation':
      return { intent: 'navigation.get', args: { path: contextPath } };

    case 'vocabularies':
      return {
        intent: 'vocabulary.get',
        args: {
          name: decodeURIComponent(rest.join('/')),
          title: params.get('title') ?? undefined,
          limit: params.get('b_size') ? Number(params.get('b_size')) : undefined,
        },
      };

    case 'workflow':
      return rest.length
        ? { intent: 'state.transition', args: { path: contextPath, id: rest[0] } }
        : { intent: 'state.get', args: { path: contextPath } };

    case 'move':
      return {
        intent: 'content.move',
        args: {
          path: Array.isArray(data?.source) ? data.source[0] : data?.source,
          targetParentPath: contextPath,
        },
      };

    default:
      // Anything else — @history, @sharing, @controlpanels — has no canonical
      // equivalent yet. Returning null lets the caller decide; it must not
      // silently pretend to have handled it.
      return null;
  }
}

export default routeToIntent;
