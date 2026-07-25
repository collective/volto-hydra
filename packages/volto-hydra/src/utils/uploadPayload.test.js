import { describe, it, expect } from 'vitest';
import { buildUploadPayload } from './uploadPayload';

describe('buildUploadPayload', () => {
  it('maps an image file to @type Image with an image field', () => {
    const file = { name: 'p.png', type: 'image/png' };
    const p = buildUploadPayload(file, 'data:image/png;base64,QUJD');
    expect(p).toEqual({
      '@type': 'Image',
      title: 'p.png',
      image: {
        data: 'QUJD',
        encoding: 'base64',
        'content-type': 'image/png',
        filename: 'p.png',
      },
    });
  });

  it('maps a non-image file to @type File with a file field', () => {
    const file = { name: 'notes.txt', type: 'text/plain' };
    const p = buildUploadPayload(file, 'data:text/plain;base64,SGk=');
    expect(p['@type']).toBe('File');
    expect(p.file).toEqual({
      data: 'SGk=',
      encoding: 'base64',
      'content-type': 'text/plain',
      filename: 'notes.txt',
    });
  });

  it('treats a missing/empty MIME type as a File', () => {
    const p = buildUploadPayload(
      { name: 'x', type: '' },
      'data:application/octet-stream;base64,AA==',
    );
    expect(p['@type']).toBe('File');
  });

  it('throws on an unparseable data URL (fail loudly)', () => {
    expect(() =>
      buildUploadPayload({ name: 'x', type: 'image/png' }, 'not-a-data-url'),
    ).toThrow();
  });
});
