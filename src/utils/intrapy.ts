const INTRAPY_BASE = "https://intrapy.intra.42.fr";

export function waitForIntrapyToken(
  timeout = 4000,
): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    let timer: ReturnType<typeof setTimeout>;

    const handler = (e: CustomEvent) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(e.detail);
    };
    const cleanup = () => {
      document.removeEventListener(
        "42_INTRAPY_TOKEN",
        handler as EventListener,
      );
      clearTimeout(timer);
    };
    document.addEventListener("42_INTRAPY_TOKEN", handler as EventListener);

    const stored = sessionStorage.getItem("ft_intrapy_token");
    if (stored) {
      resolved = true;
      cleanup();
      resolve(stored);
      return;
    }

    timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeout);
  });
}

export async function isPisciner(login: string): Promise<boolean> {
  try {
    const token = await waitForIntrapyToken();
    if (!token) return false;

    const res = await fetch(`${INTRAPY_BASE}/api/v1/users/${login}/cursus`, {
      headers: { Authorization: token },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as Array<{
      grade?: string;
      slug?: string;
    }>;
    if (!Array.isArray(data)) return false;

    const hasPiscine = data.some((c) => c.grade === "Pisciner");
    if (!hasPiscine) return false;
    const hasCommonCore = data.some((c) => c.slug === "42cursus");
    return !hasCommonCore;
  } catch {
    return false;
  }
}
