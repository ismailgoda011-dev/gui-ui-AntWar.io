// AntWar UI release metadata. Bump VERSION for every intentional UI update.
export const APP_VERSION = '1.7.1';
export const APP_RELEASE = '2026-09-14';
export const APP_BUILD_LABEL = `v${APP_VERSION}`;

window.ANTWAR_APP_VERSION = Object.freeze({
  version: APP_VERSION,
  release: APP_RELEASE,
  label: APP_BUILD_LABEL
});
