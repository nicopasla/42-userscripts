import { html, render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { ref } from "lit-html/directives/ref.js";
import { getConfig } from "../../config.ts";
import DISCORD_SVG from "../../assets/svg/discord.svg?raw";
import FORTY_TWO_SVG from "../../assets/svg/42_Logo.svg?raw";
import { hashLogin } from "../../utils/crypto";
import { loginWith42, clearAuthFailed } from "../account/account.ts";

const WORKER_URL = "https://api.betterintra.com";

type StepState = "locked" | "active" | "done";

function stepClass(s: StepState) {
  return s === "done" ? "step-success" : s === "active" ? "step-primary" : "";
}

function stepCard(
  label: string,
  desc: ReturnType<typeof html>,
  state: StepState,
  controls: ReturnType<typeof html>,
) {
  return html`
    <div
      class="flex items-center gap-4 px-4 py-3 rounded-xl ${state === "locked"
        ? "opacity-40 grayscale pointer-events-none"
        : "bg-base-300/50"}"
    >
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-3">
          <div class="flex flex-col">
            <span class="text-sm font-medium">${label}</span>
            <span class="text-xs opacity-50">${desc}</span>
          </div>
          ${controls}
        </div>
      </div>
    </div>
  `;
}

export function renderDiscordPanel() {
  const renderPanel = (el: Element | undefined) => {
    if (!el) return;
    const container = el as HTMLElement;

    const prev = (container as any).__discordPanelListener;
    if (prev) {
      chrome.storage.onChanged.removeListener(prev);
    }

    const update = async () => {
      const [store, discordEnabled, quietEnabled, quietStart, quietEnd] =
        await Promise.all([
          chrome.storage.local.get([
            "CLOUD_TOKEN",
            "CLOUD_LOGIN",
            "DISCORD_ID",
            "DISCORD_USERNAME",
            "DISCORD_EVAL_REGISTERED",
            "DISCORD_TEST_OK",
          ]),
          getConfig("DISCORD_ENABLED"),
          getConfig("DISCORD_QUIET_ENABLED"),
          getConfig("DISCORD_QUIET_START"),
          getConfig("DISCORD_QUIET_END"),
        ]);
      const token = String(store.CLOUD_TOKEN || "");
      const login = String(store.CLOUD_LOGIN || "");
      const discordId = String(store.DISCORD_ID || "");
      const discordUsername = String(store.DISCORD_USERNAME || "");
      const discordOn = !!discordEnabled;
      const has42 = !!(token && login);
      const quietOn = !!quietEnabled;
      const qStart = String(quietStart || "22:00");
      const qEnd = String(quietEnd || "08:00");
      const validated = !!store.DISCORD_TEST_OK;

      let evalActive = !!store.DISCORD_EVAL_REGISTERED;

      const shouldBeRegistered = has42 && discordOn && !!discordId;
      if (shouldBeRegistered && !evalActive) {
        try {
          const hashed = await hashLogin(login);
          const res = await fetch(
            `${WORKER_URL}/api/v1/private/evaluations?login=${encodeURIComponent(hashed)}&action=register`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (res.ok) {
            await chrome.storage.local.set({ DISCORD_EVAL_REGISTERED: true });
            evalActive = true;
          }
        } catch {}
      } else if (!shouldBeRegistered && evalActive) {
        try {
          const hashed = await hashLogin(login);
          await fetch(
            `${WORKER_URL}/api/v1/private/evaluations?login=${encodeURIComponent(hashed)}&action=unregister`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch {}
        await chrome.storage.local.set({ DISCORD_EVAL_REGISTERED: false });
        evalActive = false;
      }

      const authUrl = has42
        ? `${WORKER_URL}/discord/auth?redirect_uri=${encodeURIComponent(
            window.location.href,
          )}&token=${encodeURIComponent(token)}&login=${encodeURIComponent(login)}`
        : "";

      const s1: StepState = has42 ? "done" : "active";
      const s2: StepState = !has42 ? "locked" : discordId ? "done" : "active";
      const s3: StepState = !discordId
        ? "locked"
        : discordOn
          ? "done"
          : "active";
      const s4: StepState =
        !discordId || !discordOn ? "locked" : validated ? "done" : "active";

      const step1Controls = !has42
        ? html`<button
            type="button"
            class="btn bg-[#00babc] text-white border-none hover:bg-[#1fd2d4] h-12 text-base flex items-center justify-center gap-3 transition-colors duration-200"
            @click="${() => {
              loginWith42(async () => {
                await clearAuthFailed();
                window.location.reload();
              });
            }}"
          >
            <span
              class="size-8 flex items-center justify-center [&_path]:fill-current"
              >${unsafeHTML(FORTY_TWO_SVG)}</span
            >
            Connect
          </button>`
        : html`<span class="text-sm text-green-500 font-medium"
            >Connected</span
          >`;

      const step2Controls = html`<input
        type="checkbox"
        class="toggle toggle-accent toggle-lg"
        .checked="${discordOn}"
        @change="${(e: Event) => {
          chrome.storage.local.set({
            DISCORD_ENABLED: (e.target as HTMLInputElement).checked,
          });
        }}"
      />`;

      const step3Controls = !discordId
        ? html`<button
            type="button"
            class="btn bg-[#5865F2] text-white border-none hover:bg-[#4752C4] h-12 text-base flex items-center justify-center gap-3 transition-colors duration-200"
            @click="${() => {
              window.open(authUrl, "_blank");
            }}"
          >
            <span
              class="size-8 flex items-center justify-center [&_path]:fill-current"
              >${unsafeHTML(DISCORD_SVG)}</span
            >
            Link
          </button>`
        : html`<div class="flex items-center gap-3">
            <span class="badge badge-success gap-2 text-sm py-1.5"
              >@${discordUsername || discordId}</span
            >
            <button
              type="button"
              class="btn btn-error btn-sm"
              @click="${async (e: Event) => {
                const btn = e.target as HTMLButtonElement;
                btn.disabled = true;
                btn.innerText = "Removing...";
                await chrome.storage.local.remove([
                  "DISCORD_ID",
                  "DISCORD_USERNAME",
                  "DISCORD_EVAL_REGISTERED",
                  "DISCORD_TEST_OK",
                ]);
                update();
              }}"
            >
              Remove
            </button>
          </div>`;

      const step4Controls = html`<div class="flex items-start gap-3">
        <div class="flex-1"></div>
        <div class="flex flex-col items-end gap-1">
          <span class="text-xs status-text" style="display:none"></span>
          <button
            type="button"
            class="${validated
              ? "btn bg-[#22c55e] text-white border-none btn-sm"
              : "btn btn-accent btn-sm"}"
            ?disabled="${validated}"
            @click="${async (e: Event) => {
              const btn = e.target as HTMLButtonElement;
              const outerDiv = btn.closest(".flex.items-start") as HTMLElement;
              const statusEl = outerDiv.querySelector(
                ".status-text",
              ) as HTMLElement;
              statusEl.style.display = "block";
              statusEl.textContent = "Sending...";
              statusEl.className = "text-xs status-text";
              btn.disabled = true;
              btn.className = "btn btn-accent btn-sm";
              try {
                const res = await fetch(
                  `${WORKER_URL}/api/v1/private/discord/test`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ login, discordId }),
                  },
                );
                if (res.ok) {
                  await chrome.storage.local.set({ DISCORD_TEST_OK: true });
                  update();
                } else {
                  const err = await res.text();
                  statusEl.textContent = `✗ ${err}`;
                  statusEl.className = "text-xs text-[#ef4444] status-text";
                  btn.className =
                    "btn bg-[#ef4444] text-white border-none btn-sm";
                  setTimeout(() => {
                    update();
                  }, 6000);
                }
              } catch {
                statusEl.textContent = "✗ Network error";
                statusEl.className = "text-xs text-[#ef4444] status-text";
                btn.className =
                  "btn bg-[#ef4444] text-white border-none btn-sm";
                setTimeout(() => {
                  update();
                }, 6000);
              }
            }}"
          >
            ${validated ? "Validated" : "Test"}
          </button>
        </div>
      </div>`;

      render(
        html`
          <div class="card bg-base-200 shadow-sm p-5 sm:p-6 col-span-full">
            <span class="text-base font-medium">Discord</span>
            <p class="text-sm opacity-60 mt-1 mb-4">
              Get evaluation reminders via Discord DM - booked and 15-min reveal
              notifications.
            </p>
            <ul class="steps steps-vertical w-full">
              <li class="step ${stepClass(s1)}">
                <div class="w-full text-left">
                  ${stepCard(
                    "Connect 42 Account",
                    html`Link your 42 account for cloud features`,
                    s1,
                    step1Controls,
                  )}
                </div>
              </li>
              <li class="step ${stepClass(s2)}">
                <div class="w-full text-left">
                  ${stepCard(
                    "Link Discord Account",
                    html`Authorize the bot to send you DMs - it will auto-join
                      <a
                        href="https://discord.gg/rFhA36rq9"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="underline hover:text-accent"
                        >Le Bassin</a
                      >
                      for you.`,
                    s2,
                    step3Controls,
                  )}
                </div>
              </li>
              <li class="step ${stepClass(s3)}">
                <div class="w-full text-left">
                  ${stepCard(
                    "Enable Notifications",
                    html`Allow Discord DM alerts for evaluations`,
                    s3,
                    step2Controls,
                  )}
                  ${discordId && discordOn
                    ? html`
                        <div
                          class="flex items-center gap-4 px-4 py-2 ${quietOn
                            ? ""
                            : "opacity-60"}"
                        >
                          <span class="shrink-0 font-medium">Quiet hours</span>
                          <input
                            type="checkbox"
                            class="toggle toggle-accent"
                            .checked="${quietOn}"
                            @change="${(e: Event) => {
                              chrome.storage.local.set({
                                DISCORD_QUIET_ENABLED: (
                                  e.target as HTMLInputElement
                                ).checked,
                              });
                            }}"
                          />
                          ${quietOn
                            ? html`
                                <label class="flex items-center gap-2 ml-auto">
                                  <span class="text-sm text-base-content/70"
                                    >From</span
                                  >
                                  <input
                                    type="time"
                                    class="input input-bordered w-32"
                                    .value="${qStart}"
                                    @change="${(e: Event) => {
                                      chrome.storage.local.set({
                                        DISCORD_QUIET_START: (
                                          e.target as HTMLInputElement
                                        ).value,
                                      });
                                    }}"
                                  />
                                </label>
                                <label class="flex items-center gap-2">
                                  <span class="text-sm text-base-content/70"
                                    >To</span
                                  >
                                  <input
                                    type="time"
                                    class="input input-bordered w-32"
                                    .value="${qEnd}"
                                    @change="${(e: Event) => {
                                      chrome.storage.local.set({
                                        DISCORD_QUIET_END: (
                                          e.target as HTMLInputElement
                                        ).value,
                                      });
                                    }}"
                                  />
                                </label>
                              `
                            : ""}
                        </div>
                      `
                    : ""}
                </div>
              </li>
              <li class="step ${stepClass(s4)}">
                <div class="w-full text-left">
                  ${stepCard(
                    "Test Notifications",
                    html`Send a test DM to verify everything works`,
                    s4,
                    step4Controls,
                  )}
                  ${has42 && discordId
                    ? html`
                        <div
                          class="flex items-center gap-3 px-4 py-3 rounded-xl ${evalActive
                            ? "bg-green-500/15 text-green-500"
                            : "bg-red-500/15 text-red-500"} font-medium"
                        >
                          <span class="text-xl">${evalActive ? "✓" : "✗"}</span>
                          Evaluations ${evalActive ? "active" : "inactive"}
                        </div>
                      `
                    : ""}
                </div>
              </li>
            </ul>
          </div>
        `,
        container,
      );
    };

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
    ) => {
      if (
        "DISCORD_ID" in changes ||
        "DISCORD_USERNAME" in changes ||
        "DISCORD_ENABLED" in changes ||
        "DISCORD_QUIET_ENABLED" in changes ||
        "DISCORD_QUIET_START" in changes ||
        "DISCORD_QUIET_END" in changes ||
        "DISCORD_TEST_OK" in changes
      ) {
        update();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    (container as any).__discordPanelListener = listener;

    update();
  };

  return html`<div ${ref(renderPanel)} class="col-span-full"></div>`;
}
