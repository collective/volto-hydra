/**
 * Build a createContent payload from a dropped/picked file and its data URL.
 * image/* → Plone Image (image field); anything else → File (file field).
 *
 * @param {{name: string, type: string}} file
 * @param {string} dataUrl - result of readAsDataURL(file)
 * @returns {object} createContent body
 */
export function buildUploadPayload(file, dataUrl) {
  const fields = dataUrl.match(/^data:(.*);(.*),(.*)$/);
  if (!fields) {
    throw new Error(`buildUploadPayload: unparseable data URL for ${file.name}`);
  }
  const isImage = (file.type || '').startsWith('image/');
  const field = isImage ? 'image' : 'file';
  return {
    '@type': isImage ? 'Image' : 'File',
    title: file.name,
    [field]: {
      data: fields[3],
      encoding: fields[2],
      'content-type': fields[1],
      filename: file.name,
    },
  };
}
