// React binding over the routed STORE (selective-sync layer). Reads on mount and
// stays subscribed (via useStored), so a flag the options page flips shows in an
// open popup live; writes through on change.
import { useCallback, useState } from "react";
import { STORE } from "../platform/storage.js";
import { useStored } from "./useStored.js";

// A boolean flag with the project's "default on/off" semantics: when `defaultOn`,
// only an explicit stored `false` turns it off; otherwise only an explicit `true`
// turns it on. Mirrors the old `r.key !== false` / `r.key === true` reads.
export function useStoredFlag(key: string, defaultOn: boolean): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(defaultOn);
  useStored([key], (r) => setOn(defaultOn ? r[key] !== false : r[key] === true));
  const set = useCallback(
    (next: boolean) => {
      setOn(next);
      STORE.set({ [key]: next });
    },
    [key],
  );
  return [on, set];
}
