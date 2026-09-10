/**
 * domain-matcher.ts — So khớp hostname an toàn chống Domain Spoofing
 */

export function isDomainMatch(currentHostname: string, targetDomain: string): boolean {
  if (!currentHostname || !targetDomain) return false;
  const host = currentHostname.toLowerCase();
  const target = targetDomain.toLowerCase();
  return host === target || host.endsWith('.' + target);
}
