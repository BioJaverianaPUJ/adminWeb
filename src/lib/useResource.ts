import { useEffect, useState } from "react";
import type { Page } from "../../shared/types";
import { api, errorMessage } from "./api";
export function useResource<T>(
  resource: string,
  filters: Record<string, string>,
) {
  const [page, setPage] = useState(0),
    [data, setData] = useState<Page<T> | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const query = JSON.stringify(filters);
  useEffect(() => {
    setPage(0);
  }, [query, resource]);
  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        ...JSON.parse(query),
        page: String(page),
        size: "12",
      });
      api<Page<T>>(`/resources/${resource}?${params}`, { signal: c.signal })
        .then(setData)
        .catch((e) => {
          if (!c.signal.aborted) setError(errorMessage(e));
        })
        .finally(() => {
          if (!c.signal.aborted) setBusy(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [resource, query, page, revision]);
  return {
    page,
    setPage,
    data,
    busy,
    error,
    reload: () => setRevision((v) => v + 1),
  };
}
