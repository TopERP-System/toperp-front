import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getUserInitials = () => {
    if (user?.nome) {
      return user.nome
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'A';
  };

  const menuItems = [
    { icon: Shield, label: "Painel Admin", href: "/admin" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ${
          sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full lg:w-20 lg:translate-x-0"
        }`}
      >
        {/* Logo - Fixo no topo */}
        <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-sidebar-border">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-bold text-sidebar-foreground">Admin Panel</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation - Área rolável */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden min-h-0">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  sidebarOpen ? "justify-start" : "justify-center"
                } ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout - Fixo no final */}
        <div className="flex-shrink-0 px-3 pt-2 pb-3 border-t border-sidebar-border space-y-2">
          {sidebarOpen && user && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent/20">
              <p className="text-xs text-sidebar-foreground/70 mb-1">Logado como</p>
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.nome || user.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60 mt-1">
                {user.role === 'SUPER_ADMIN' ? 'Super Administrador' : user.role}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 min-w-0 transition-all duration-300 ${
        sidebarOpen ? "lg:ml-64" : "lg:ml-20"
      }`}>
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full primary-gradient flex items-center justify-center text-primary-foreground font-semibold">
              {getUserInitials()}
            </div>
          </div>
        </header>

        {/* Content */}
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;

