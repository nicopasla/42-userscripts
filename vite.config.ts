import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "42 Intra Suite",
        namespace: "42-userscripts/nicopasla",
        match: ["https://profile-v3.intra.42.fr/*", "https://*.intra.42.fr/*"],
        grant: ["GM_getValue", "GM_setValue", "GM_deleteValue"],
      },
      build: {
        autoGrant: true,
      },
      server: {
        open: true,
      },
    }),
  ],
});
