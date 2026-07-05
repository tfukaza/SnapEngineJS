import { useCallback, useReducer } from "react";
import { flushSync } from "react-dom";

export function useSnapSortAwaitMutation(): () => void {
  const [, forceFlush] = useReducer((version: number) => version + 1, 0);

  return useCallback(() => {
    flushSync(() => {
      forceFlush();
    });
  }, []);
}
