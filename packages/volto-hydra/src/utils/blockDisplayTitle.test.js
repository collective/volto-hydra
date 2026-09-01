/**
 * One name for a block, wherever it is listed.
 *
 * The failure this prevents is not a crash: it is the same question reading
 * "Text" in the child list and "Your name" in a picker, which nobody reports
 * and everybody has to work around.
 */
import { describe, test, expect, vi } from 'vitest';

vi.mock('@plone/volto/registry', () => ({
  default: {
    blocks: { blocksConfig: { text: { title: 'Text' } } },
  },
}));

import { blockDisplayTitle } from './blockDisplayTitle';

describe('blockDisplayTitle', () => {
  test('a nominated field wins — a form question is its label', () => {
    const data = { '@type': 'text', label: 'Your name', plaintext: 'ignored' };
    expect(blockDisplayTitle(data, { labelField: 'label' })).toBe('Your name');
  });

  test('title, then label, then the indexed text', () => {
    expect(blockDisplayTitle({ '@type': 'text', title: 'A' })).toBe('A');
    expect(blockDisplayTitle({ '@type': 'text', label: 'B' })).toBe('B');
    expect(blockDisplayTitle({ '@type': 'text', plaintext: 'C' })).toBe('C');
  });

  test('a block with no words of its own is named by its type', () => {
    expect(blockDisplayTitle({ '@type': 'text' })).toBe('Text');
    expect(blockDisplayTitle({ '@type': 'unregistered' })).toBe('unregistered');
  });

  test('blank is not a name', () => {
    // An empty heading would otherwise win and leave an unreadable entry.
    expect(blockDisplayTitle({ '@type': 'text', title: '   ' })).toBe('Text');
  });

  test('the fallback names what nothing else can', () => {
    expect(blockDisplayTitle({}, { fallback: 'Item 3' })).toBe('Item 3');
  });
});
