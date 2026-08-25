// Makes native "flash" bulletin boxes (e.g. "Important links: ... by Bocal")
// collapsible: only the header row (icon + title + timestamp) is shown by
// default, clicking it slides the rest of the content open/closed.

const FLASH_ITEM_SELECTOR = ".border-b-2.border-legacy-main";

function collapseFlashItem(item: HTMLElement) {
  if (item.dataset.ftFlashInit) return;

  const contentWrap = item.querySelector<HTMLElement>(
    "div.flex.flex-col.text-sm.gap-1.w-full",
  );
  if (!contentWrap) return;

  const children = Array.from(contentWrap.children) as HTMLElement[];
  if (children.length < 2) return; // nothing beyond the header row to collapse

  item.dataset.ftFlashInit = "1";

  const header = children[0];
  const bodyChildren = children.slice(1);

  const body = document.createElement("div");
  body.className = "ft-flash-body";
  body.style.cssText =
    "overflow:hidden;max-height:0px;opacity:0;transition:max-height .35s ease, opacity .25s ease;";
  contentWrap.insertBefore(body, header.nextSibling);
  for (const child of bodyChildren) body.appendChild(child);

  header.style.cursor = "pointer";

  let expanded = false;
  const setExpanded = (next: boolean) => {
    expanded = next;
    if (expanded) {
      body.style.maxHeight = `${body.scrollHeight}px`;
      body.style.opacity = "1";
    } else {
      // lock the current (possibly "none") height to a concrete px value
      // first so the collapse can actually animate from it
      body.style.maxHeight = `${body.scrollHeight}px`;
      requestAnimationFrame(() => {
        body.style.maxHeight = "0px";
        body.style.opacity = "0";
      });
    }
  };

  body.addEventListener("transitionend", (e) => {
    if (e.propertyName === "max-height" && expanded) {
      // let the box grow/shrink freely with its content once fully open
      body.style.maxHeight = "none";
    }
  });

  header.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    setExpanded(!expanded);
  });
}

let flashInitialized = false;

export function initFlashCollapse() {
  if (flashInitialized) return;
  if (
    location.hostname !== "profile-v3.intra.42.fr" ||
    !(location.pathname === "/" || location.pathname.startsWith("/users"))
  )
    return;
  flashInitialized = true;

  const scan = () => {
    document
      .querySelectorAll<HTMLElement>(FLASH_ITEM_SELECTOR)
      .forEach(collapseFlashItem);
  };

  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
}
