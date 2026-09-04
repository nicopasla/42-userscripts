import {
  applyCloudSettings,
  clearAuthFailed,
  fetchMySettings,
  loginWith42,
  logoutCloud,
  syncToCloud,
  testCloudConnection,
  wipeAllCloudData,
} from "./account";
import { AccountState, resetButtonState } from "./state";

export function createHandlers(state: AccountState, updateUI: () => void) {
  const handleLogin42 = () => {
    loginWith42(async () => {
      await clearAuthFailed();
      void chrome.runtime
        .sendMessage({ type: "FT_RELOAD_INTRA_TABS" })
        .catch(() => reloadActiveTab());
      window.close();
    });
  };

  const reloadActiveTab = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) chrome.tabs.reload(tab.id);
  };

  const reloadTab = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) chrome.tabs.reload(tab.id);
  };

  const handleDelete = async () => {
    if (confirm("Disconnect and clear your cloud session data locally?")) {
      await logoutCloud();
      await reloadTab();
    }
  };

  const handleWipe = async () => {
    if (
      !confirm(
        "This will permanently delete ALL your saved settings and sessions from the cloud. Are you sure?",
      )
    )
      return;

    const success = await wipeAllCloudData();
    if (success) {
      alert("All cloud data successfully wiped.");
      await reloadTab();
    } else {
      alert("Failed to delete cloud data. Please try again.");
    }
  };

  const handlePush = async () => {
    if (state.buttons.push.loading) return;

    state.buttons.push = { loading: true, text: "Connecting..." } as any;
    updateUI();

    if (!(await testCloudConnection())) {
      state.buttons.push = {
        loading: false,
        error: true,
        text: "Connection Failed",
      } as any;
      updateUI();
      setTimeout(() => {
        resetButtonState(state, "push", "Push Settings");
        updateUI();
      }, 2500);
      return;
    }

    const success = await syncToCloud();
    if (success) {
      await clearAuthFailed();
      await chrome.storage.local.set({ LAST_CLOUD_SYNC: Date.now() });
      state.buttons.push = {
        loading: false,
        success: true,
        text: "Synced!",
      } as any;
    } else {
      state.buttons.push = {
        loading: false,
        error: true,
        text: "Sync Failed",
      } as any;
    }
    updateUI();
    setTimeout(() => {
      resetButtonState(state, "push", "Push Settings");
      updateUI();
    }, 2500);
  };

  const handleOpenIntra = () => {
    window.open("https://intra.42.fr", "_blank");
  };

  const handleToggleRestrictActivation = async (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    state.restrictActivation = checked;
    await chrome.storage.local.set({ RESTRICT_ACTIVATION: checked });
    updateUI();
  };

  const handlePull = async () => {
    if (state.buttons.pull.loading) return;
    if (!confirm("Overwrite current local settings with cloud backup?")) return;

    state.buttons.pull = { loading: true, text: "Connecting..." } as any;
    updateUI();

    if (!(await testCloudConnection())) {
      state.buttons.pull = {
        loading: false,
        error: true,
        text: "Connection Failed",
      } as any;
      updateUI();
      setTimeout(() => {
        resetButtonState(state, "pull", "Pull Settings");
        updateUI();
      }, 2000);
      return;
    }

    const settings = await fetchMySettings();
    if (settings) {
      await clearAuthFailed();
      await applyCloudSettings(settings);
      await chrome.storage.local.set({ LAST_CLOUD_SYNC: Date.now() });
      state.buttons.pull = {
        loading: false,
        success: true,
        text: "Restored!",
      } as any;
      updateUI();
      setTimeout(() => reloadTab(), 1500);
    } else {
      state.buttons.pull = {
        loading: false,
        error: true,
        text: "No Data Found",
      } as any;
      updateUI();
      setTimeout(() => {
        resetButtonState(state, "pull", "Pull Settings");
        updateUI();
      }, 2000);
    }
  };

  return {
    handleLogin42,
    handleDelete,
    handleWipe,
    handlePush,
    handlePull,
    handleToggleRestrictActivation,
  };
}
