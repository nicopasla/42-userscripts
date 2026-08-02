import { sharedCSS } from "../assets/shared-styles.ts";

export interface CountdownOptions {
  digits?: number;
  units?: string[];
}

export interface CountdownInstance {
  el: HTMLElement;
  update: (values: number[]) => void;
}

export function createCountdown(
  initialValues: number[],
  options: CountdownOptions = {},
): CountdownInstance {
  const host = document.createElement("span");
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = sharedCSS;
  root.appendChild(style);

  const countdownEl = document.createElement("span");
  countdownEl.className = "countdown font-mono";
  root.appendChild(countdownEl);

  const renderValue = (value: number) =>
    options.digits
      ? String(value).padStart(options.digits, "0")
      : String(value);

  const segments: HTMLSpanElement[] = [];
  initialValues.forEach((value, i) => {
    const seg = document.createElement("span");
    seg.style.setProperty("--value", String(value));
    if (options.digits) {
      seg.style.setProperty("--digits", String(options.digits));
    }
    seg.setAttribute("aria-live", "polite");
    seg.setAttribute("aria-label", renderValue(value));
    seg.textContent = renderValue(value);
    segments.push(seg);
    countdownEl.appendChild(seg);
    const unit = options.units?.[i];
    if (unit) {
      countdownEl.appendChild(document.createTextNode(unit));
    } else if (i < initialValues.length - 1) {
      countdownEl.appendChild(document.createTextNode(":"));
    }
  });

  const update = (values: number[]) => {
    segments.forEach((seg, i) => {
      const value = values[i] ?? 0;
      seg.style.setProperty("--value", String(value));
      seg.setAttribute("aria-label", renderValue(value));
      seg.textContent = renderValue(value);
    });
  };

  return { el: host, update };
}
