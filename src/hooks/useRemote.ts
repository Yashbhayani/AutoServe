import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
/** Invalidate results when the account, filters or component change. */
export function useRemote<T>(load: () => Promise<T>, keys: unknown[] = []) {
  const { accountId } = useApp();
  const key = JSON.stringify([accountId, ...keys]);
  const [state, setState] = useState<{data?: T; error: string; loading: boolean; key: string}>({error: "", loading: true, key});
  const [revision, setRevision] = useState(0);
  const loader = useRef(load); loader.current = load;
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    let alive = true;
    setState({error: "", loading: true, key});
    if (!accountId) {setState({error: "Please sign in.", loading: false, key});return;}
    loader.current().then(data => {if (alive) setState({data, error: "", loading: false, key});})
      .catch(error => {if (alive) setState({error: error instanceof Error ? error.message : "Unable to load data.", loading: false, key});});
    return () => {alive = false;};
  }, [accountId, revision, key]);
  return {...(state.key === key ? state : {data: undefined, error: "", loading: true}), refresh};
}
