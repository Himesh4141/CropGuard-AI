const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)
    ?.replace(/\/+$/, "") ?? "";

const HEALTH_URL = `${API_BASE_URL}/health`;

const MAX_ATTEMPTS = 30;
const RETRY_DELAY_MS = 2_000;
const REQUEST_TIMEOUT_MS = 8_000;

let warmupPromise: Promise<boolean> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function probeBackend(): Promise<boolean> {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(HEALTH_URL, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    /*
     * Even if CORS temporarily prevents us from reading the response,
     * this request still helps wake the Render service.
     */
    try {
      await fetch(HEALTH_URL, {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        mode: "no-cors",
      });
    } catch {
      // Render may still be waking up.
    }

    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function warmBackend(): Promise<boolean> {
  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    window.dispatchEvent(
      new CustomEvent("cropguard:backend-starting"),
    );

    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS;
      attempt += 1
    ) {
      const ready = await probeBackend();

      if (ready) {
        window.dispatchEvent(
          new CustomEvent("cropguard:backend-ready"),
        );

        return true;
      }

      window.dispatchEvent(
        new CustomEvent(
          "cropguard:backend-waiting",
          {
            detail: {
              attempt,
              maxAttempts: MAX_ATTEMPTS,
            },
          },
        ),
      );

      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }

    window.dispatchEvent(
      new CustomEvent("cropguard:backend-timeout"),
    );

    return false;
  })();

  return warmupPromise;
}

/*
 * Start waking Render immediately when the JavaScript bundle loads.
 * The user does not need to press Login first.
 */
void warmBackend();