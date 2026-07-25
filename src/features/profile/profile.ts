import { updateEventFilters, injectEventsSelect } from "./events/events.ts";
import { findSlotsButton, redirectDefenseLinks } from "./shortcuts.ts";
import { replaceMoulinetteImage } from "./moulinette.ts";
import { injectCustomStyles, updateVisuals } from "./visuals.ts";
import { handleProfileRedirect } from "./highlight.ts";
import { initLayoutManager } from "./layout.ts";
import { initMilestones } from "./milestones.ts";
import { initFreezeCard } from "./freeze.ts";
import { findProfileCard, initProfileCardStyling } from "./profile-card.ts";
import { injectFriendsWidget } from "../friends/friends.ui.ts";
import { colorTrackerBadge } from "../logtime/tracker-card.ts";
import { initAchievements } from "./achievements.ts";
import { initMarks } from "./marks.ts";
import { initProjectBadges } from "./project-badges.ts";
import { initProjectsSort } from "./projects-sort.ts";
import { initRouletteStats } from "./roulette-stats.ts";
import { initEvaluations } from "./evaluations.ts";
import { initBadges } from "./badges.ts";
import { initTranscript } from "./transcript.ts";
import { initPace } from "./pace.ts";
import { ensureCampusData } from "../clusters/clusters.data.ts";

const waitForBody = () =>
  document.body
    ? Promise.resolve()
    : new Promise<void>((r) => {
        const id = setInterval(() => {
          if (document.body) {
            clearInterval(id);
            r();
          }
        }, 10);
      });

export async function initProfile() {
  injectCustomStyles();
  await waitForBody();
  if (location.origin === "https://projects.intra.42.fr") {
    await redirectDefenseLinks();
    replaceMoulinetteImage();
  }
  if (location.origin !== "https://profile-v3.intra.42.fr") return;

  void ensureCampusData();

  let isUpdating = false;
  let needsRerun = false;

  const scheduleUpdate = () => {
    needsRerun = false;
    requestAnimationFrame(() => updateUI());
  };

  const updateUI = async () => {
    if (isUpdating) return;
    isUpdating = true;
    try {
      await updateVisuals();
      if (location.pathname === "/" || location.pathname.startsWith("/users")) {
        if (!findProfileCard()) return;

        await Promise.allSettled([
          initLayoutManager(),
          initProfileCardStyling(),
          initAchievements(),
          initMarks(),
          initProjectBadges(),
          initProjectsSort(),
          initRouletteStats(),
          initEvaluations(),
          findSlotsButton(),
          injectEventsSelect(),
          updateEventFilters(),
          handleProfileRedirect(),
          initMilestones(),
          initBadges(),
          initTranscript(),
          initPace(),
        ]);
        // Fire-and-forget: features with >2s timeouts or slow network fetches
        initFreezeCard();
        injectFriendsWidget();
        if (location.pathname === "/") colorTrackerBadge();
      }
    } finally {
      isUpdating = false;
      if (needsRerun) {
        scheduleUpdate();
      } else if (location.pathname.startsWith("/users")) {
        observer.disconnect();
      }
    }
  };

  const observer = new MutationObserver(() => {
    if (isUpdating) {
      needsRerun = true;
    } else {
      scheduleUpdate();
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  scheduleUpdate();

  if (location.pathname !== "/") {
    setTimeout(() => observer.disconnect(), 10000);
  }
}
