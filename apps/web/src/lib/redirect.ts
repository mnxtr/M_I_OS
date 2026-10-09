/** Resolve a local return path without allowing URL-parser origin changes. */
export function safeRedirectPath(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) {
    return '/workspace';
  }
  const origin = 'https://mios.invalid';
  const target = new URL(value, origin);
  return target.origin === origin ? `${target.pathname}${target.search}${target.hash}` : '/workspace';
}
