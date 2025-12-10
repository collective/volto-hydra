/**
 * Context for overriding the SidebarPortal target element.
 * When provided, the portal will render to this target instead of the default tab.
 * Used by ParentBlocksWidget to render parent block Edit components' sidebar content
 * to separate DOM elements for each parent in the hierarchy.
 */
import React from 'react';

export const SidebarPortalTargetContext = React.createContext(null);
