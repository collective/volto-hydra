import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-intl-redux';
import configureStore from 'redux-mock-store';
import { UrlWidget as VoltoUrlWidget } from '@plone/volto/components/manage/Widgets/UrlWidget';
import { ArrayAwareUrlWidget } from './ArrayAwareUrlWidget';

const store = configureStore()({
  intl: { locale: 'en', messages: {} },
});

// The shape the link/media editor writes for a `widget: 'url'` field: an
// object-browser link array holding an external URL (or an internal ref).
const ARRAY_VALUE = [{ '@id': 'https://www.youtube.com/embed/aqz-KE-bpKQ' }];

const widgetProps = {
  id: 'url',
  title: 'URL',
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onClick: vi.fn(),
};

describe('url field with the object-browser array value', () => {
  // Shows the problem: Volto's stock UrlWidget is string-only. It runs
  // `flattenToAppURL(props.value)` on mount, which does `url.replace(...)` — and
  // an array has no `.replace`, so rendering the widget throws and the sidebar
  // form dies. This is what broke setting a video's url in the editor.
  it("Volto's UrlWidget throws on the array value (the bug)", () => {
    expect(() =>
      render(
        <Provider store={store}>
          <VoltoUrlWidget {...widgetProps} value={ARRAY_VALUE} />
        </Provider>,
      ),
    ).toThrow();
  });

  // The fix: normalize the array to its url string before delegating, so the
  // widget renders the url instead of crashing.
  it('ArrayAwareUrlWidget renders the url from the array value', () => {
    render(
      <Provider store={store}>
        <ArrayAwareUrlWidget {...widgetProps} value={ARRAY_VALUE} />
      </Provider>,
    );
    expect(screen.getByRole('textbox')).toHaveValue(
      'https://www.youtube.com/embed/aqz-KE-bpKQ',
    );
  });

  // A plain string value still works unchanged.
  it('ArrayAwareUrlWidget still renders a plain string value', () => {
    render(
      <Provider store={store}>
        <ArrayAwareUrlWidget
          {...widgetProps}
          value="https://example.com/video.mp4"
        />
      </Provider>,
    );
    expect(screen.getByRole('textbox')).toHaveValue(
      'https://example.com/video.mp4',
    );
  });
});
