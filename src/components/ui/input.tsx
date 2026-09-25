import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Sem `max`, o navegador aceita ano com até 6 dígitos (ex.: 202655).
 * O limite padrão restringe o ano a 4 dígitos; um `max` informado pela tela prevalece.
 */
const MAX_PADRAO_DATA: Partial<Record<string, string>> = {
  date: "9999-12-31",
  "datetime-local": "9999-12-31T23:59",
  month: "9999-12",
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
        max={props.max ?? (type ? MAX_PADRAO_DATA[type] : undefined)}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
