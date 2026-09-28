import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneClass = {
  in: "border-transparent bg-primary/15 text-primary",
  late: "border-transparent bg-destructive/10 text-destructive",
  left: "border-transparent bg-secondary text-secondary-foreground",
  absent: "border-transparent bg-muted text-muted-foreground",
  active: "border-transparent bg-primary/15 text-primary",
  inactive: "border-transparent bg-destructive/10 text-destructive",
} as const;

export function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof toneClass;
  children: React.ReactNode;
}) {
  return (
    <Badge variant="outline" className={cn("h-6 px-2", toneClass[tone])}>
      {children}
    </Badge>
  );
}
