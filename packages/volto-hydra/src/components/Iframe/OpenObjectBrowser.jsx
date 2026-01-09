import withObjectBrowser from '@plone/volto/components/manage/Sidebar/ObjectBrowser';
import React, { useEffect } from 'react';
/**
 * An empty fragment component wrapped around by `withObjectBrowser` hoc, that
 * listens for messages from the iframe and opens the object browser
 * using the `openObjectBrowser` method from the props.
 *
 * Also handles field-level media selection from the toolbar via pendingFieldMedia prop.
 *
 * @param {*} props
 * @returns
 */
const OpenObjectBrowser = (props) => {
  const {
    openObjectBrowser,
    closeObjectBrowser,
    isInlineEditingRef,
    origin,
    pendingFieldMedia,  // { fieldName, blockUid } for toolbar field selection
    onFieldMediaSelected,  // Callback: (fieldName, blockUid, imagePath) => void
    onFieldMediaCancelled,  // Callback: () => void
  } = props;

  // Handle iframe OPEN_OBJECT_BROWSER messages
  useEffect(() => {
    const messageHandler = (e) => {
      if (e.origin !== origin) {
        return;
      }
      if (e.data.type === 'OPEN_OBJECT_BROWSER') {
        openObjectBrowser({
          mode: e.data.mode,
          propDataName: 'data',
          onSelectItem: (item) => {
            e.source.postMessage(
              {
                type: 'OBJECT_SELECTED',
                path: item,
              },
              e.origin,
            );
            closeObjectBrowser();
            isInlineEditingRef.current = true;
          },
        });
      }
    };
    window.addEventListener('message', messageHandler);
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [closeObjectBrowser, isInlineEditingRef, openObjectBrowser, origin]);

  // Handle toolbar field-level media selection
  useEffect(() => {
    if (pendingFieldMedia?.fieldName && pendingFieldMedia?.blockUid) {
      // Capture values before clearing state
      const { fieldName, blockUid } = pendingFieldMedia;

      // Clear state immediately to prevent reopening on re-renders
      if (onFieldMediaCancelled) {
        onFieldMediaCancelled();
      }

      openObjectBrowser({
        mode: 'image',
        propDataName: 'data',
        onSelectItem: (item) => {
          if (onFieldMediaSelected) {
            onFieldMediaSelected(fieldName, blockUid, item);
          }
          closeObjectBrowser();
        },
      });
    }
  }, [pendingFieldMedia, openObjectBrowser, closeObjectBrowser, onFieldMediaSelected, onFieldMediaCancelled]);

  return <></>;
};

export default withObjectBrowser(OpenObjectBrowser);
