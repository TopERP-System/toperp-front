import { cn } from "@/lib/utils";

interface TopERPLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  variant?: "sidebar" | "landing";
}

export const TopERPLogo = ({ className, showText = false, textClassName, variant = "sidebar" }: TopERPLogoProps) => {
  const logoSrc = variant === "sidebar" ? "/logobranca.png" : "/logo.png";
  const logoSize = variant === "sidebar" ? "h-21" : "h-16 sm:h-20 md:h-24 lg:h-28";
  
  return (
    <div className={cn("flex items-center gap-2", variant === "sidebar" && "pt-6", className)}>
      <img 
        src={logoSrc} 
        alt="TopERP Logo" 
        className={cn(logoSize, "w-auto object-contain")}
      />
      {showText && (
        <span className={cn("text-xl font-bold", textClassName || "text-foreground")}>
          TopERP
        </span>
      )}
    </div>
  );
};
