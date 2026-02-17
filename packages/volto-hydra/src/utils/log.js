// Centralised debug logging for the admin UI.
// Disabled by default; enable via window.HYDRA_DEBUG.
// When window.__testRunId is set, every line includes [RUN-<id>] so
// parallel repeat-each runs can be separated in CI output.
//
// Usage:
//   import { createLog } from '../../utils/log';
//   const log = createLog('VIEW');   // → prefix "[VIEW]" or "[VIEW][RUN-3]"

const isDebugEnabled = () =>
  typeof window !== 'undefined' && window.HYDRA_DEBUG;

export function createLog(tag) {
  return (...args) => {
    if (!isDebugEnabled()) return;
    const runId = typeof window !== 'undefined' && window.__testRunId;
    const prefix = runId != null ? `[${tag}][RUN-${runId}]` : `[${tag}]`;
    console.log(prefix, ...args);
  };
}
