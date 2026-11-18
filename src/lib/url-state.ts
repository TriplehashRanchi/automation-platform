"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Update URL search params (null removes a key). Keeps other params. */
export function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return useCallback(
    (updates: Record<string, string | null | undefined>, opts: { replace?: boolean } = { replace: true }) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (opts.replace === false) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [router, pathname, sp],
  );
}
