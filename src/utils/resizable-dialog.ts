export interface ResizableDialogOptions {
  minWidth?: number;
  minHeight?: number;
  onResizeStart?: () => void;
  onResize?: (width: number, height: number) => void;
}

const VIEWPORT_MARGIN = 32;

export function makeResizable(
  dialog: HTMLDialogElement,
  opts: ResizableDialogOptions = {},
): () => void {
  const { minWidth = 360, minHeight = 320, onResizeStart, onResize } = opts;

  const grip = document.createElement("div");
  grip.style.cssText = [
    "position:absolute;",
    "right:0;bottom:0;",
    "width:22px;height:22px;",
    "cursor:nwse-resize;",
    "z-index:9999;",
    "touch-action:none;",
    "user-select:none;",
    "border-radius:0 0 1rem 0;",
    "background:linear-gradient(135deg, transparent 0 50%, rgba(128,128,128,0.9) 50% 60%, transparent 60% 70%, rgba(128,128,128,0.9) 70% 80%, transparent 80%);",
    "opacity:0.4;",
  ].join("");
  grip.dataset.tip = "Drag to resize";
  grip.dataset.tipSize = "13px";
  dialog.appendChild(grip);

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startW = dialog.getBoundingClientRect().width;
    const startH = dialog.getBoundingClientRect().height;
    const startX = e.clientX;
    const startY = e.clientY;
    grip.style.opacity = "0.9";
    onResizeStart?.();

    const move = (ev: PointerEvent) => {
      const w = Math.round(
        Math.min(
          Math.max(startW + (ev.clientX - startX), minWidth),
          window.innerWidth - VIEWPORT_MARGIN,
        ),
      );
      const h = Math.round(
        Math.min(
          Math.max(startH + (ev.clientY - startY), minHeight),
          window.innerHeight - VIEWPORT_MARGIN,
        ),
      );
      dialog.style.width = `${w}px`;
      dialog.style.height = `${h}px`;
      onResize?.(w, h);
    };

    const up = () => {
      grip.style.opacity = "0.4";
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      suppressNextClick();
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  let suppressClick: ((ce: MouseEvent) => void) | null = null;
  let suppressTimer: number | null = null;

  const suppressNextClick = () => {
    if (suppressClick) {
      document.removeEventListener("click", suppressClick, true);
      suppressClick = null;
    }
    if (suppressTimer !== null) {
      window.clearTimeout(suppressTimer);
    }
    suppressClick = (ce: MouseEvent) => {
      ce.preventDefault();
      ce.stopPropagation();
      cleanupSuppress();
    };
    document.addEventListener("click", suppressClick, true);
    suppressTimer = window.setTimeout(cleanupSuppress, 250);
  };

  const cleanupSuppress = () => {
    if (suppressClick) {
      document.removeEventListener("click", suppressClick, true);
      suppressClick = null;
    }
    if (suppressTimer !== null) {
      window.clearTimeout(suppressTimer);
      suppressTimer = null;
    }
  };

  grip.addEventListener("pointerdown", onPointerDown);

  return () => {
    cleanupSuppress();
    grip.removeEventListener("pointerdown", onPointerDown);
    grip.remove();
  };
}
