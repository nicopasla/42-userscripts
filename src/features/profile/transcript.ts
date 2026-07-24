import { html, render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { getConfig } from "../../config.ts";
import { getCloudLogin } from "../account/account.ts";
import { sharedCSS } from "../../assets/shared-styles.ts";

const TRANSCRIPTS: {
  cursusLabel: string;
  records: { label: string; sr_id: number }[];
}[] = [
  {
    cursusLabel: "42cursus",
    records: [
      { label: "English", sr_id: 14 },
      { label: "Français", sr_id: 120 },
      { label: "Dutch", sr_id: 119 },
    ],
  },
  {
    cursusLabel: "C Piscine Brussels",
    records: [
      { label: "English", sr_id: 118 },
      { label: "Français", sr_id: 116 },
      { label: "Dutch", sr_id: 122 },
    ],
  },
];

async function openTranscriptDialog(login: string) {
  if (document.getElementById("ft-transcript-dialog")) return;
  const currentYear = new Date().getFullYear();

  const themePref = await getConfig("BETTER_INTRA_THEME");
  const isDark =
    themePref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : themePref !== "light";
  const presetKey = (await getConfig("PROFILE_THEME_PRESET")) || "dark";
  const currentTheme =
    presetKey !== "dark" && presetKey !== "light"
      ? presetKey
      : isDark
        ? "dark"
        : "light";

  const dialog = Object.assign(document.createElement("dialog"), {
    id: "ft-transcript-dialog",
    className: "bg-transparent",
  });

  const backdropStyle = document.createElement("style");
  backdropStyle.textContent = `#ft-transcript-dialog::backdrop { background: rgba(0,0,0,0.5); }`;
  if (!document.getElementById("ft-ts-backdrop-style")) {
    backdropStyle.id = "ft-ts-backdrop-style";
    document.head.appendChild(backdropStyle);
  }
  Object.assign(dialog.style, {
    width: "min(320px, calc(100dvw - 2rem))",
    maxHeight: "80vh",
    borderRadius: "1.5rem",
    overflowY: "auto",
    padding: "0",
  });

  const content = document.createElement("div");
  content.style.cssText = "width:100%;display:flex;flex-direction:column;";
  dialog.appendChild(content);
  document.body.appendChild(dialog);

  const shadow = content.attachShadow({ mode: "open" });

  const handleSubmit = () => {
    const langInput = shadow.querySelector<HTMLInputElement>(
      'input[name="ft-ts-lang"]:checked',
    );
    const startInput = shadow.querySelector<HTMLInputElement>(".ft-ts-start");
    const endInput = shadow.querySelector<HTMLInputElement>(".ft-ts-end");
    if (!langInput || !startInput || !endInput) return;

    const srId = langInput.value;
    const start = startInput.value || String(currentYear);
    const end = endInput.value || String(currentYear);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = `https://projects.intra.42.fr/users/${login}/transcripts/${srId}/generate.pdf`;
    form.target = "_blank";
    const addHidden = (name: string, value: string) => {
      const i = document.createElement("input");
      i.type = "hidden";
      i.name = name;
      i.value = value;
      form.appendChild(i);
    };
    addHidden("start_year", start);
    addHidden("end_year", end);
    addHidden("sr_id", srId);
    document.body.appendChild(form);
    form.submit();
    form.remove();

    dialog.close();
    dialog.remove();
  };

  const close = () => {
    dialog.close();
    dialog.remove();
  };

  const renderFormContent = (cursusIdx: number, langSrId?: string) => {
    const entry = TRANSCRIPTS[cursusIdx];
    const records = entry.records;
    const currentLang = langSrId || String(records[0].sr_id);

    render(
      html`
        <style>
          :host { display: block; }
          ${unsafeHTML(sharedCSS)}
        </style>
        <div
          data-theme="${currentTheme}"
          class="flex flex-col p-4 gap-3 bg-base-100"
        >
          <div class="flex justify-between items-center shrink-0">
            <span class="text-sm font-bold uppercase">Transcript</span>
            <button
              type="button"
              class="btn btn-circle btn-ghost btn-sm"
              @click=${close}
            >
              ✕
            </button>
          </div>

          <div class="join">
            ${TRANSCRIPTS.map(
              (t, i) =>
                html`<input
                  type="radio"
                  name="ft-ts-cursus"
                  class="join-item btn btn-outline btn-sm flex-1"
                  aria-label="${t.cursusLabel}"
                  value="${i}"
                  ?checked="${i === cursusIdx}"
                  @change="${(e: Event) => {
                    const input = e.target as HTMLInputElement;
                    if (input.checked)
                      renderFormContent(Number(input.value), currentLang);
                  }}"
                />`,
            )}
          </div>

          <div class="join">
            ${records.map(
              (r) =>
                html`<input
                  type="radio"
                  name="ft-ts-lang"
                  class="join-item btn btn-outline btn-sm flex-1"
                  aria-label="${r.label}"
                  value="${r.sr_id}"
                  ?checked="${String(r.sr_id) === currentLang}"
                />`,
            )}
          </div>

          <div class="flex gap-2">
            <input
              class="ft-ts-start input input-sm flex-1 w-0"
              type="number"
              min="2013"
              max=${currentYear}
              value=${currentYear}
              placeholder="Start"
            />
            <input
              class="ft-ts-end input input-sm flex-1 w-0"
              type="number"
              min="2013"
              max=${currentYear}
              value=${currentYear}
              placeholder="End"
            />
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              class="btn btn-sm btn-ghost flex-1"
              @click=${close}
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-sm btn-success flex-1"
              @click=${handleSubmit}
            >
              Download
            </button>
          </div>
        </div>
      `,
      shadow,
    );
  };

  content.addEventListener("click", (e) => e.stopPropagation());
  dialog.addEventListener("click", () => close());

  dialog.showModal();
  renderFormContent(0);
}

export async function initTranscript() {
  if (
    location.hostname !== "profile-v3.intra.42.fr" ||
    location.pathname !== "/"
  )
    return;

  const cloudLogin = await getCloudLogin();
  const token = await getConfig("CLOUD_TOKEN");
  if (!cloudLogin || !token) return;

  const campusId = await getConfig("CLUSTERS_CAMPUS");
  if (campusId !== "12") return;

  const tryInject = () => {
    const cards = document.querySelectorAll<HTMLElement>(".bg-white.md\\:h-96");
    const projectsCard = [...cards].find((c) => {
      const titleEl = c.querySelector("[class*='uppercase']");
      return titleEl?.textContent?.trim().toUpperCase() === "PROJECTS";
    });
    if (!projectsCard) {
      requestAnimationFrame(tryInject);
      return;
    }
    if (projectsCard.querySelector("[data-ft-transcript]")) return;

    const inner = projectsCard.querySelector<HTMLElement>(
      ".flex.flex-col.w-full.h-full",
    );
    if (!inner) {
      requestAnimationFrame(tryInject);
      return;
    }

    const transcriptBtn = document.createElement("a");
    transcriptBtn.setAttribute("data-ft-transcript", "");
    transcriptBtn.className =
      "text-center text-legacy-main bg-transparent border border-legacy-main py-1.5 px-2 cursor-pointer text-xs uppercase hover:opacity-80";
    transcriptBtn.style.cursor = "pointer";
    transcriptBtn.textContent = "Transcript";
    transcriptBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openTranscriptDialog(cloudLogin);
    });

    const actionRow = inner.querySelector<HTMLElement>(".flex.flex-row.gap-2");
    if (actionRow) {
      actionRow.insertBefore(transcriptBtn, actionRow.firstChild);
    } else {
      inner.insertBefore(transcriptBtn, inner.firstChild);
    }
  };

  requestAnimationFrame(tryInject);
}
