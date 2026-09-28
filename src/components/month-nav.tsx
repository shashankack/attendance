import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMonth, shiftMonth } from "@/lib/time";

export function MonthNav({ month, hrefFor }: { month: string; hrefFor: (month: string) => string }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={hrefFor(shiftMonth(month, -1))}>
          <ChevronLeft />
          Previous
        </Link>
      </Button>
      <span className="min-w-40 text-center font-serif text-2xl">{formatMonth(month)}</span>
      <Button variant="outline" size="sm" asChild>
        <Link href={hrefFor(shiftMonth(month, 1))}>
          Next
          <ChevronRight />
        </Link>
      </Button>
    </div>
  );
}
