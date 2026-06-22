// Read the given storage keys on mount and again whenever any of them changes,
// so an open popup reflects edits made elsewhere (the options page) live instead
// of showing the values it happened to load with. The on-video overlay is the
// main beneficiary — it stays open across tab switches, so without this it keeps
// stale settings after the options page changes them. `apply` may be an inline
// closure; only the key list drives (re)subscription.
import { useEffect, useRef } from "react";
import { STORE, subscribe } from "../platform/storage.js";

export function useStored(keys: string[], apply: (r: Record<string, unknown>) => void): void {
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const keyId = keys.join("\0");
  useEffect(() => {
    const list = keyId.split("\0");
    const read = () => STORE.get(list, (r) => applyRef.current(r));
    read();
    return subscribe(list, read);
  }, [keyId]);
}
