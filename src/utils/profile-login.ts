const RESERVED_SEGMENTS = new Set(["me", "achievements", "slots", "projects"]);

export function getLoginFromPage(): string | null {
  const pathParts = location.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "users" && pathParts[1]) return pathParts[1];

  const own = document.querySelector<HTMLElement>("[data-login]");
  if (own?.textContent?.trim()) return own.textContent.trim();

  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/users/"]',
  )) {
    const parts = link.pathname.split("/").filter(Boolean);
    const usersIdx = parts.indexOf("users");
    if (usersIdx !== -1 && parts.length > usersIdx + 1) {
      const login = parts[usersIdx + 1];
      if (login && !RESERVED_SEGMENTS.has(login)) return login;
    }
  }

  return null;
}