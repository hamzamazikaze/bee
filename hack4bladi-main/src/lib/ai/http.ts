/**
 * The two things every external call in this app needs: a bounded signal and a
 * failure that returns rather than throws.
 */

/**
 * An AbortSignal that fires after `ms`, also aborting if the caller's signal does.
 * `AbortSignal.timeout` and `AbortSignal.any` are platform features — no library, no
 * timer to clean up. A provider that can hang forever is a bug.
 */
export function boundedSignal(ms: number, outer?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return outer ? AbortSignal.any([outer, timeout]) : timeout;
}

/**
 * Runs `task` and returns `fallback` on any failure — timeout, network, bad JSON, a
 * provider returning 500. A timeout is not an error; it is the signal to use local data.
 * Never surfaces a provider name to the caller.
 */
export async function orFallback<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

/** Models fence their JSON often enough that stripping it is cheaper than re-prompting. */
export function parseJsonLoosely(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
