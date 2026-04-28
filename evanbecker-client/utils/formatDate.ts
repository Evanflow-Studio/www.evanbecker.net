/**
 * Format a YYYY-MM-DD article date string for display, treating it as a
 * calendar date in the viewer's local timezone.
 *
 * The naive `new Date('2026-04-27').toLocaleDateString(...)` is the trap:
 * the bare YYYY-MM-DD form is parsed by the spec as UTC midnight, which
 * for any viewer west of UTC renders as the *previous* calendar day. The
 * SSR pass uses the date as a string and looks correct, then the client
 * hydration re-parses it through Date and shifts it back by one day. The
 * "briefly shows the right date then jumps to the wrong one" symptom is
 * the visible expression of that hydration mismatch.
 *
 * Appending `T00:00:00` (no Z) is parsed per spec as local time, so the
 * Date object lands on the intended calendar day on both server and
 * client regardless of timezone.
 */
export function formatArticleDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
