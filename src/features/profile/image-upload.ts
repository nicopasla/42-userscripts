import { getConfig } from "../../config.ts";
import { hashLogin } from "../account/account.ts";

const WORKER_URL = "https://api.betterintra.com";

export async function uploadImage(file: File): Promise<string> {
  const token = await getConfig("CLOUD_TOKEN");
  const login = await getConfig("CLOUD_LOGIN");
  if (!token || !login) throw new Error("Not connected to cloud");

  const hashedLogin = await hashLogin(login);
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `${WORKER_URL}/api/v1/private/image-upload?login=${encodeURIComponent(hashedLogin)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

  if (res.status === 401) {
    await chrome.storage.local.set({ CLOUD_AUTH_FAILED: true });
    throw new Error("Session expired. Please reconnect to cloud.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}
