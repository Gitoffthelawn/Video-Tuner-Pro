// Reads the background's update-check result (local storage, per-browser) so the
// header can show a "newer version available" dot next to the version.
import { useEffect, useState } from "react";
import { api } from "../platform/browser.js";
import { UPDATE_AVAILABLE_KEY, UPDATE_LATEST_KEY } from "../../shared/update.js";

export interface UpdateState {
  available: boolean;
  latest: string;
}

export function useUpdate(): UpdateState {
  const [available, setAvailable] = useState(false);
  const [latest, setLatest] = useState("");

  useEffect(() => {
    api.storage.local.get([UPDATE_AVAILABLE_KEY, UPDATE_LATEST_KEY], (r) => {
      setAvailable(!!r[UPDATE_AVAILABLE_KEY]);
      setLatest((r[UPDATE_LATEST_KEY] as string) || "");
    });
  }, []);

  return { available, latest };
}
