import AppLayout from "@/components/layout/AppLayout";
import { ModulePageHeader } from "@/components/layout/ModulePageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { Link } from "react-router-dom";

interface EmDesenvolvimentoPageProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export default function EmDesenvolvimentoPage({
  icon,
  title,
  subtitle,
  description = "Esta funcionalidade está sendo desenvolvida e estará disponível em breve. Agradecemos a sua paciência.",
  backHref = "/financeiro",
  backLabel = "Voltar ao Financeiro",
}: EmDesenvolvimentoPageProps) {
  return (
    <AppLayout>
      <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
        <ModulePageHeader icon={icon} title={title} subtitle={subtitle} />

        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-lg border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10 sm:py-12">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Construction className="h-7 w-7" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Em desenvolvimento</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
              <Button asChild variant="outline" className="mt-8 min-w-[10rem]">
                <Link to={backHref}>{backLabel}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
