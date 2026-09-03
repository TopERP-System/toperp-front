import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Heart,
  Lock,
  LogIn,
  Mail,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRedirectAfterLogin } from "@/hooks/useRedirectAfterLogin";
import { cn } from "@/lib/utils";
import { LoginBackground } from "@/components/login/LoginBackground";

type SponsorTileTone = "light" | "dark";

const LOGIN_SPONSORS: { id: string; src: string; alt: string; tone?: SponsorTileTone }[] = [
  { id: "grupo-legal", src: "/logo-patrocinador.png", alt: "Grupo Legal Embalagens" },
  { id: "agromais", src: "/agromais_logo.jpg.jpeg", alt: "Agromais Alimentos" },
  {
    id: "clinica-pet",
    src: encodeURI("/clínica pet.jpg"),
    alt: "Pronto Socorro Pet - Clínica Veterinária",
  },
  {
    id: "suburbio",
    src: encodeURI("/Captura de tela 2026-05-15 171326.png"),
    alt: "Subúrbio",
    tone: "dark",
  },
  {
    id: "rota-quimica",
    src: "/DOC-20260515-WA0266..jpg",
    alt: "Rota Química Transportes e Logística",
  },
  {
    id: "rboscardin",
    src: "/patrocinador-rboscardin.jpeg",
    alt: "RBOSCARDIN - Arquitetura, Engenharia e Construção Civil",
  },
  {
    id: "hotel-lanchonete",
    src: "/patrocinador-hotel-lanchonete.png",
    alt: "Hotel, Restaurante e Lanchonete",
  },
];

const HIGHLIGHTS = [
  {
    icon: Shield,
    title: "Segurança de ponta",
    description: "Dados protegidos com controle de acesso por perfil.",
  },
  {
    icon: BarChart3,
    title: "Gestão integrada",
    description: "Financeiro, estoque e operações em um só lugar.",
  },
  {
    icon: TrendingUp,
    title: "Resultados reais",
    description: "Indicadores claros para decisões mais assertivas.",
  },
] as const;

function sponsorTileClass(tone: SponsorTileTone): string {
  return tone === "dark"
    ? "bg-zinc-950 ring-zinc-800"
    : "bg-slate-50 ring-slate-200/80";
}

function LoginSponsorsFooter() {
  return (
    <footer className="relative z-20 shrink-0 px-4 pb-3 pt-1 sm:px-6 sm:pb-4 lg:px-8 lg:pb-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl bg-white px-5 py-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] ring-1 ring-slate-200/80 sm:flex-row sm:items-center sm:gap-5 sm:px-7 sm:py-4"
      >
        <motion.div className="flex min-w-0 items-center gap-2.5 sm:max-w-[14rem] sm:shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Heart className="h-4 w-4" aria-hidden />
          </div>
          <p className="text-xs font-medium leading-snug text-slate-700 sm:text-sm">
            Patrocinadores que acreditam no nosso propósito
          </p>
        </motion.div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 sm:justify-end sm:gap-2.5">
          {LOGIN_SPONSORS.map((sponsor, index) => {
            const tone = sponsor.tone ?? "light";
            return (
              <motion.div
                key={sponsor.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.5 + index * 0.05 }}
                className={cn(
                  "flex h-12 w-[5.5rem] items-center justify-center rounded-lg p-1.5 ring-1 sm:h-14 sm:w-24",
                  sponsorTileClass(tone),
                )}
              >
                <img
                  src={sponsor.src}
                  alt={sponsor.alt}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </footer>
  );
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isLoading: authLoading } = useAuth();

  useRedirectAfterLogin();

  if (authLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(var(--navy))]">
        <LoginBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <Zap className="h-7 w-7 animate-pulse text-cyan" />
          </div>
          <p className="text-sm text-white/70">Carregando...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({
        email: email.trim(),
        senha: password,
      });

      const userFromResponse = response?.user || response?.usuario;
      const role = userFromResponse?.role?.toUpperCase()?.trim();
      const destino = role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
      window.location.assign(destino);
    } catch (error) {
      console.error("Erro no login:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden bg-[hsl(var(--navy))]">
      <LoginBackground />

      {/* Área principal: split */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-center lg:gap-6 xl:gap-8 lg:px-8 xl:px-12 lg:py-4">
        {/* Painel esquerdo — proposta de valor */}
        <section className="relative flex w-full max-w-xl flex-col justify-center lg:max-w-lg lg:flex-1 lg:items-end xl:max-w-xl">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            className="w-full lg:max-w-xl"
          >
            <Link to="/" className="mb-3 inline-flex items-center gap-3 sm:mb-4">
              <img
                src="/logobranca.png"
                alt="TopERP"
                className="h-20 w-auto object-contain sm:h-24 md:h-28 lg:h-32 xl:h-36"
              />
            </Link>

            <h1 className="font-[Manrope,system-ui,sans-serif] text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl xl:text-[2.25rem] xl:leading-[1.15]">
              Gestão inteligente para quem{" "}
              <span className="text-cyan">faz</span> acontecer.
            </h1>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
              O TopERP conecta finanças, estoque, vendas e operações em uma plataforma
              segura e intuitiva para o seu negócio crescer.
            </p>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {HIGHLIGHTS.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
                  className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm"
                >
                  <item.icon className="mb-1.5 h-5 w-5 text-cyan" aria-hidden />
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/60">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Painel direito — login */}
        <section className="flex w-full max-w-lg shrink-0 flex-col justify-center sm:max-w-xl lg:w-auto lg:max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="w-full"
          >
            <motion.div className="rounded-2xl border border-white/40 bg-white/5 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl backdrop-saturate-150 sm:p-7">
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Bem-vindo(a)!
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Faça login para acessar sua conta
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm text-white/90">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 border border-white/40 bg-white/5 pl-10 text-sm text-white backdrop-blur-md placeholder:text-white/50 focus-visible:border-white/70 focus-visible:ring-white/30"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm text-white/90">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 border border-white/40 bg-white/5 pl-10 pr-10 text-sm text-white backdrop-blur-md placeholder:text-white/50 focus-visible:border-white/70 focus-visible:ring-white/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/60 hover:text-white"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm font-medium text-cyan hover:text-cyan/80"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="h-12 w-full gap-2 border border-white/30 text-base font-semibold shadow-lg shadow-primary/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-5 text-center text-xs text-white/60">
                © {new Date().getFullYear()} TopERP. Todos os direitos reservados.
              </p>
            </motion.div>

            <Link
              to="/"
              className="mt-4 flex items-center justify-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white lg:hidden"
            >
              Voltar ao início
            </Link>
          </motion.div>
        </section>
      </div>

      <LoginSponsorsFooter />
    </div>
  );
};

export default Login;
