import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  BarChart3, 
  ShoppingCart, 
  Truck, 
  Users, 
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  TrendingUp
} from "lucide-react";
import { TopERPLogo } from "@/components/TopERPLogo";
import { openWhatsApp } from "@/lib/whatsapp";

const features = [
  {
    icon: Package,
    title: "Gerenciamento de Estoque",
    description: "Controle completo do seu estoque com alertas de níveis baixos, movimentações e localização de produtos."
  },
  {
    icon: BarChart3,
    title: "Dashboards Financeiros",
    description: "Visualize receitas, despesas e tendências com gráficos interativos e relatórios detalhados."
  },
  {
    icon: ShoppingCart,
    title: "Gerenciamento de Pedidos",
    description: "Acompanhe pedidos de compra e venda, status de entrega e histórico completo."
  },
  {
    icon: Truck,
    title: "Gerenciamento de Fornecedores",
    description: "Cadastre e gerencie seus fornecedores, histórico de compras e condições comerciais."
  },
  {
    icon: Users,
    title: "Gerenciamento de Clientes",
    description: "Base de clientes organizada com histórico de vendas, preferências e relacionamento."
  }
];

const benefits = [
  "Aumente sua produtividade em até 40%",
  "Reduza erros operacionais",
  "Tome decisões baseadas em dados",
  "Acesso em qualquer dispositivo"
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <TopERPLogo variant="landing" showText={false} />
          <Link to="/login">
            <Button variant="gradient" size="lg">
              Acessar Sistema
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-royal/10 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-azure/10 rounded-full blur-3xl animate-float" />
        </div>

        <div className="container mx-auto relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-cyan/10 text-cyan text-sm font-medium mb-6">
              Sistema ERP Completo
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Gerencie seu negócio com{" "}
              <span className="gradient-text">inteligência</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Uma plataforma completa para controlar estoque, finanças, pedidos, 
              fornecedores e clientes em um só lugar.
            </p>
            <div className="flex justify-center">
              <Button 
                variant="hero" 
                size="xl"
                onClick={openWhatsApp}
              >
                Falar com Consultor
              </Button>
            </div>
          </motion.div>

          {/* Benefits list */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 mt-16"
          >
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-cyan" />
                <span>{benefit}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-card">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa em um só sistema
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Funcionalidades completas para transformar a gestão do seu negócio
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-background border border-border hover:border-cyan/50 hover:shadow-lg hover:shadow-cyan/5 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl primary-gradient flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow duration-300">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}

            {/* Extra card - CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="p-6 rounded-2xl hero-gradient text-primary-foreground flex flex-col justify-center"
            >
              <TrendingUp className="w-10 h-10 mb-4 text-cyan" />
              <h3 className="text-xl font-semibold mb-2">
                E muito mais...
              </h3>
              <p className="text-primary-foreground/80 mb-4">
                Relatórios, integrações, suporte dedicado e atualizações constantes.
              </p>
              <Button 
                variant="hero" 
                className="w-fit"
                onClick={openWhatsApp}
              >
                Falar com Consultor
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
            {[
              { value: "3", label: "Empresas Ativas" },
              { value: "10x", label: "Mais Produtividade" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl hero-gradient p-12 md:p-16 text-center overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-azure/20 rounded-full blur-3xl" />
            
            <div className="relative">
              <Shield className="w-16 h-16 text-cyan mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Pronto para transformar sua gestão?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-4 max-w-xl mx-auto">
                Comece agora mesmo e veja como é fácil ter controle total do seu negócio.
              </p>
              <p className="text-primary-foreground/90 text-xl font-semibold mb-8 max-w-xl mx-auto">
                Não espere sua empresa entrar no vermelho
              </p>
              <div className="flex justify-center">
                <Button 
                  variant="hero" 
                  size="xl"
                  onClick={openWhatsApp}
                  className="bg-white text-foreground hover:bg-white/90 border border-cyan"
                >
                  Fale com um Consultor
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <TopERPLogo variant="landing" showText={false} />
          <p className="text-muted-foreground text-sm">
            © 2025 TopERP. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
