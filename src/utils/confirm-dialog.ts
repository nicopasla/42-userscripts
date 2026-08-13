import { html, render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { sharedCSS } from "../assets/shared-styles.ts";

const DIALOG_ID = "ft-confirm-dialog";

interface ConfirmDialogOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export async function showConfirmDialog(
  options: ConfirmDialogOptions,
): Promise<boolean> {
  const { message, confirmLabel = "Confirm", cancelLabel = "Cancel" } = options;

  document.getElementById(DIALOG_ID)?.remove();

  const dialog = document.createElement("dialog");
  dialog.id = DIALOG_ID;
  dialog.className = "bg-transparent backdrop:bg-black/50";
  dialog.style.padding = "0";
  dialog.style.border = "none";
  dialog.style.borderRadius = "1rem";
  dialog.style.maxWidth = "26rem";
  dialog.style.width = "calc(100dvw - 2rem)";

  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });

  let resolvePromise!: (value: boolean) => void;
  const promise = new Promise<boolean>((r) => (resolvePromise = r));

  const resolve = (value: boolean) => {
    dialog.close();
    dialog.remove();
    resolvePromise(value);
  };

  render(
    html`
      <style>
        ${unsafeHTML(sharedCSS)}
      </style>
      <div
        data-theme="light"
        class="alert items-center shadow-2xl"
        style="border-radius:1rem;"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="h-6 w-6 shrink-0 stroke-current"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="flex flex-col gap-1 text-left">
          <h3 class="font-bold text-base">Restore cloud settings</h3>
          <p class="text-sm opacity-80">${message}</p>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="btn btn-sm btn-error" @click="${() => resolve(false)}">
            ${cancelLabel}
          </button>
          <button
            class="btn btn-sm btn-success font-bold"
            @click="${() => resolve(true)}"
          >
            ${confirmLabel}
          </button>
        </div>
      </div>
    `,
    shadow,
  );

  dialog.appendChild(host);
  document.body.appendChild(dialog);
  dialog.showModal();

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) resolve(false);
  });

  return promise;
}
