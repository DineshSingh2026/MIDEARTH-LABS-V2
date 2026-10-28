export type PlatformId = "mac" | "win" | "android" | "ios";
export function detectPlatform(): PlatformId | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Mac/i.test(ua)) return "mac";
  if (/Win/i.test(ua)) return "win";
  return null;
}
