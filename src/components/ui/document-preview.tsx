import * as React from "react";
import { cn } from "@/lib/utils";
import { formatDocument } from "@/lib/validators";

interface DocumentPreviewProps {
  value: string;
  className?: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ value, className }) => {
  if (!value || value.trim().length === 0) {
    return null;
  }

  const formatted = formatDocument(value);
  const cleaned = value.replace(/[^\d]/g, '');
  const isCPF = cleaned.length === 11;
  const isCNPJ = cleaned.length === 14;
  const isValidLength = isCPF || isCNPJ;

  return (
    <div
      className={cn(
        "relative rounded-lg border border-[#1e3a5f] bg-[#f8f9fa] p-5 transition-all",
        "shadow-sm min-h-[80px] flex items-center justify-center",
        className
      )}
    >
      {/* Barra superior azul escura */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1e3a5f] rounded-t-lg" />
      
      {/* Conteúdo */}
      <div className="relative w-full text-center">
        <p
          className={cn(
            "text-2xl font-semibold tracking-wider",
            "text-[#1e3a5f]",
            "font-sans select-none"
          )}
          style={{
            textShadow: "0 1px 2px rgba(30, 58, 95, 0.15)",
            background: "linear-gradient(to bottom, #1e3a5f 0%, #2d4a6f 50%, #1e3a5f 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {formatted || value}
        </p>
        
        {/* Indicador de tipo */}
        {isValidLength && (
          <p className="text-xs text-center mt-2 text-[#1e3a5f]/60 font-medium">
            {isCPF ? "CPF" : "CNPJ"}
          </p>
        )}
      </div>
    </div>
  );
};

