import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "primary-gradient text-primary-foreground shadow-md hover:shadow-lg hover:opacity-90",
        accent: "accent-gradient text-accent-foreground shadow-md hover:shadow-glow",
        hero: "bg-card text-foreground border-2 border-cyan hover:bg-cyan hover:text-navy shadow-md hover:shadow-glow transition-all duration-300",
        sidebar: "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
        /** Modais de relatório: azul sólido + texto branco */
        relatorioPrimary:
          "h-12 min-h-11 rounded-xl border-0 bg-[#3558a8] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#2a4788] hover:text-white focus-visible:ring-[#3558a8]/45",
        /** Modais de relatório: fundo claro + azul (mesma família do primário) */
        relatorioSecondary:
          "h-12 min-h-11 rounded-xl border border-[#3558a8]/40 bg-[#f4f6fb] px-4 text-sm font-medium text-[#3558a8] shadow-sm hover:bg-[#e8ecf5] hover:text-[#2a4788] focus-visible:ring-[#3558a8]/35",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] sm:h-10 sm:w-10 sm:min-h-0 sm:min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
