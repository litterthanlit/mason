import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// `useSyncExternalStore` returns the server snapshot during hydration and the
// client snapshot afterwards, without a setState-in-effect re-render.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(
    subscribe,
    () => client,
    () => server,
  );
}
