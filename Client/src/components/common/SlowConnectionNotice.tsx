import React, { useEffect, useState } from "react";
import { SLOW_REQUEST_EVENT } from "../../api/client";
import { Spinner } from "../ui";

/**
 * Small notice shown while the server is taking unusually long to answer
 * (for example the first visit after a quiet period, when it has to wake up).
 */
export const SlowConnectionNotice: React.FC = () => {
  const [slowCount, setSlowCount] = useState(0);

  useEffect(() => {
    const onChange = (event: Event) => setSlowCount(Number((event as CustomEvent<number>).detail) || 0);
    window.addEventListener(SLOW_REQUEST_EVENT, onChange);
    return () => window.removeEventListener(SLOW_REQUEST_EVENT, onChange);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      {slowCount > 0 && (
        <div
          role="status"
          className="pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-navy-100 bg-white px-4 py-3 text-sm shadow-lift"
        >
          <Spinner className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" />
          <p className="text-slate-700">
            <span className="font-semibold text-navy-900">Connecting to the server…</span> After a quiet period this
            can take up to a minute. Please keep this page open.
          </p>
        </div>
      )}
    </div>
  );
};
