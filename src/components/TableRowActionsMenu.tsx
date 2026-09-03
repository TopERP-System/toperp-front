import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreHorizontal, MoreVertical } from "lucide-react";
import type { ReactNode } from "react";

type TableRowActionsMenuProps = {
  children: ReactNode;
  icon?: "vertical" | "horizontal";
  triggerClassName?: string;
  contentClassName?: string;
  title?: string;
};

export function TableRowActionsMenu({
  children,
  icon = "vertical",
  triggerClassName,
  contentClassName,
  title = "Ações",
}: TableRowActionsMenuProps) {
  const Icon = icon === "horizontal" ? MoreHorizontal : MoreVertical;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", triggerClassName)}
          title={title}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className={cn("z-[100]", contentClassName)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
