import Link from "next/link";

import { formatMonth, shiftMonth } from "@/lib/time";

export function MonthNav({ month, hrefFor }: { month: string; hrefFor: (month: string) => string }) {
  return (
    <div className="flex items-center gap-3">
      <Link href={hrefFor(shiftMonth(month, -1))} className="rounded-full border border-line px-3 py-1 text-sm">
        Previous
      </Link>
      <span className="font-serif text-2xl">{formatMonth(month)}</span>
      <Link href={hrefFor(shiftMonth(month, 1))} className="rounded-full border border-line px-3 py-1 text-sm">
        Next
      </Link>
    </div>
  );
}
