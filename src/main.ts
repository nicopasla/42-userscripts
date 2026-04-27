import { initLogtime } from "./features/logtime.ts";
import { initClusters } from "./features/clusters.ts";
import { initProfile } from "./features/profile.ts";
import { initHubSettings } from "./features/hubSettings.ts";
import { gm } from "./lib/gm.ts";

console.log(gm.get("42 Hub ready...", false));

const bootstrap = async () => {
  console.log("42 Hub started...");

  const active = initHubSettings();
  const enabled = (id: "logtime" | "clusters" | "profile") =>
    active.includes(id);

  try {
    if (enabled("logtime")) await initLogtime();
  } catch (e) {
    console.error("[initLogtime] failed:", e);
  }

  try {
    if (enabled("clusters")) await initClusters();
  } catch (e) {
    console.error("[initClusters] failed:", e);
  }

  try {
    if (enabled("profile")) await initProfile();
  } catch (e) {
    console.error("[initProfile] failed:", e);
  }
};

bootstrap().catch((e) => console.error("[bootstrap] failed:", e));
