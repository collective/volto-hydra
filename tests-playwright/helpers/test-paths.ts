export const TEST_DATA_PREFIX = '/_test_data';
export function testPath(contentPath: string): string {
  return `${TEST_DATA_PREFIX}${contentPath}`;
}
