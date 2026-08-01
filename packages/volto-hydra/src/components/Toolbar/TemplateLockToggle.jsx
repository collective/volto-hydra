import React from 'react';
import { Icon } from '@plone/volto/components';
import lockSVG from '@plone/volto/icons/lock.svg';
import unlockSVG from '@plone/volto/icons/unlock.svg';

/**
 * The ONE lock/unlock control for a template instance.
 *
 * Locking/unlocking is a WHOLE-TEMPLATE action — never per-block. This is the
 * single button rendered in BOTH surfaces that expose it: the settings sidebar
 * (ParentBlocksWidget) and the quanta block toolbar (SyncedSlateToolbar). One
 * component, one behaviour — so the two can never drift apart (that drift is what
 * made the quanta toggle miss editable members while the sidebar showed it).
 *
 * Locked (`editing` = false) → 🔒, click to unlock & edit the template's structure.
 * Unlocked → 🔓, click to lock (review & save). The click always toggles the whole
 * instance via `onToggle(instanceId)`.
 *
 * Both legacy contract classes are kept — `template-lock-toggle` (toolbar tests +
 * AdminUIHelper) and `edit-template-toggle` (sidebar tests) — so selectors resolve
 * to this one button wherever it renders. `variant` only tweaks presentation
 * (size / background), never behaviour.
 *
 * @param {string} instanceId - the template instance this toggles
 * @param {boolean} editing - is the instance currently unlocked/being edited
 * @param {boolean} [canEdit=true] - user may edit this template (else disabled)
 * @param {(instanceId: string) => void} onToggle
 * @param {'sidebar'|'toolbar'} [variant='sidebar']
 */
export default function TemplateLockToggle({
  instanceId,
  editing,
  canEdit = true,
  onToggle,
  variant = 'sidebar',
}) {
  const toolbar = variant === 'toolbar';
  return (
    <button
      type="button"
      className={`template-lock-toggle edit-template-toggle${
        toolbar ? ' lock-icon' : ''
      }${editing ? ' edit-template-toggle--active' : ''}`}
      aria-pressed={editing}
      aria-label={editing ? 'Lock template' : 'Unlock template to edit'}
      disabled={!canEdit}
      title={
        canEdit
          ? editing
            ? 'Lock template (review & save changes)'
            : 'Unlock to edit this template'
          : 'You don’t have permission to edit this template (requires “Modify portal content”).'
      }
      onClick={(e) => {
        e.stopPropagation();
        if (canEdit) onToggle(instanceId);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '2px',
        pointerEvents: 'auto',
        cursor: canEdit ? 'pointer' : 'not-allowed',
        opacity: canEdit ? 1 : 0.5,
        padding: toolbar ? '4px 6px' : '4px',
        background: toolbar ? '#f5f5f5' : 'none',
      }}
      onMouseEnter={(e) =>
        canEdit && (e.currentTarget.style.background = '#e8e8e8')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = toolbar ? '#f5f5f5' : 'none')
      }
    >
      <Icon
        name={editing ? unlockSVG : lockSVG}
        size={toolbar ? '16px' : '20px'}
        color={editing ? '#0b78d0' : '#684cc9'}
      />
    </button>
  );
}
