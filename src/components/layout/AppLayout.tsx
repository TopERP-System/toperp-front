import { Notifications } from "@/components/Notifications";
import { TopERPLogo } from "@/components/TopERPLogo";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import {
    ChevronDown,
    ChevronRight,
    LogOut,
    Menu,
    Settings,
    Shield,
    User,
    X,
} from "lucide-react";
import {
    getAppMenu,
    groupHasActiveRoute,
    isActiveRoute,
    type MenuAction,
    type MenuEntry,
    type MenuGroup,
    type MenuLink,
} from "@/lib/menu-config";
import { filterMenuEntriesByRole } from "@/lib/role-access";
import { cn } from "@/lib/utils";
import { useRotuloRoca } from "@/hooks/useRotuloRoca";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
}

const LARGURA_MENU_COMPLETO_PX = 1024;

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const updateSidebar = () => {
      const w = window.innerWidth;
      if (w >= LARGURA_MENU_COMPLETO_PX) {
        setSidebarOpen((prev) => prev);
      } else {
        setSidebarOpen(false);
      }
    };
    const mqMenuCompleto = window.matchMedia(`(min-width: ${LARGURA_MENU_COMPLETO_PX}px)`);
    if (mqMenuCompleto.matches) setSidebarOpen(true);
    else setSidebarOpen(false);
    window.addEventListener("resize", updateSidebar);
    return () => window.removeEventListener("resize", updateSidebar);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isSuperAdmin } = useAuth();
  const { ocultarMenuControleRoca, menuControle } = useRotuloRoca();

  const menuEntries = useMemo(() => {
    const base = filterMenuEntriesByRole(getAppMenu(isSuperAdmin), user?.role);
    return base
      .filter((entry) => {
        if (ocultarMenuControleRoca && entry.kind === "link" && entry.href === "/controle-roca") {
          return false;
        }
        return true;
      })
      .map((entry) => {
        if (entry.kind === "link" && entry.href === "/controle-roca") {
          return { ...entry, label: menuControle };
        }
        return entry;
      });
  }, [isSuperAdmin, user?.role, ocultarMenuControleRoca, menuControle]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const entry of menuEntries) {
        if (entry.kind === "group" && groupHasActiveRoute(location.pathname, entry)) {
          next[entry.id] = true;
        }
      }
      return next;
    });
  }, [location.pathname, menuEntries]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleSidebar = () => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    if (w < 1024) {
      setSidebarOpen((prev) => !prev);
    } else if (w >= LARGURA_MENU_COMPLETO_PX) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarOpen(false);
    }
  };

  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < LARGURA_MENU_COMPLETO_PX) {
      setSidebarOpen(false);
    }
  };

  const getUserInitials = () => {
    if (user?.nome) {
      return user.nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const linkClasses = (active: boolean, nested = false) =>
    cn(
      "flex items-center gap-2 sm:gap-3 rounded-lg transition-all duration-200 active:opacity-90 w-full text-left min-h-[44px]",
      nested ? "px-2.5 sm:px-3 py-2.5 pl-9 sm:pl-10" : "px-2.5 sm:px-3 py-3",
      active
        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );

  const renderMenuLink = (item: MenuLink, nested = false) => {
    const active = isActiveRoute(location.pathname, item.href);
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={closeSidebarOnMobile}
        className={linkClasses(active, nested)}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {sidebarOpen && (
          <span
            className="font-medium min-w-0 max-w-full whitespace-nowrap min-[1920px]:whitespace-normal min-[1920px]:overflow-visible min-[1920px]:text-clip"
            title={item.label}
          >
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  const renderMenuAction = (item: MenuAction, nested = false) => {
    if (item.action !== "logout") return null;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          closeSidebarOnMobile();
          void handleLogout();
        }}
        className={cn(
          linkClasses(false, nested),
          "hover:bg-destructive/20 hover:text-destructive",
        )}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {sidebarOpen && <span className="font-medium whitespace-nowrap">{item.label}</span>}
      </button>
    );
  };

  const renderGroupChild = (child: MenuLink | MenuAction) => {
    if (child.kind === "link") return renderMenuLink(child, true);
    return renderMenuAction(child, true);
  };

  const renderCollapsedGroup = (group: MenuGroup) => {
    const active = groupHasActiveRoute(location.pathname, group);
    return (
      <DropdownMenu key={group.id}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center min-h-[44px] w-full rounded-lg transition-all duration-200",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
            title={group.label}
          >
            <group.icon className="w-5 h-5 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-52">
          <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {group.children.map((child) => {
            if (child.kind === "link") {
              const childActive = isActiveRoute(location.pathname, child.href);
              return (
                <DropdownMenuItem key={child.href} asChild>
                  <Link
                    to={child.href}
                    className={cn("flex items-center gap-2 cursor-pointer", childActive && "font-medium")}
                    onClick={closeSidebarOnMobile}
                  >
                    <child.icon className="w-4 h-4" />
                    {child.label}
                  </Link>
                </DropdownMenuItem>
              );
            }
            return (
              <DropdownMenuItem
                key={child.id}
                onClick={() => void handleLogout()}
                className="text-destructive focus:text-destructive cursor-pointer gap-2"
              >
                <child.icon className="w-4 h-4" />
                {child.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderExpandedGroup = (group: MenuGroup) => {
    const active = groupHasActiveRoute(location.pathname, group);
    const open = expandedGroups[group.id] ?? false;

    return (
      <Collapsible
        key={group.id}
        open={open}
        onOpenChange={(isOpen) =>
          setExpandedGroups((prev) => ({ ...prev, [group.id]: isOpen }))
        }
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-3 min-h-[44px] rounded-lg transition-all duration-200 w-full text-left",
              active
                ? "text-sidebar-primary-foreground bg-sidebar-primary/80"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <group.icon className="w-5 h-5 shrink-0" />
            {sidebarOpen && (
              <>
                <span className="font-medium flex-1 min-w-0 whitespace-nowrap">{group.label}</span>
                {open ? (
                  <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                )}
              </>
            )}
          </button>
        </CollapsibleTrigger>
        {sidebarOpen && (
          <CollapsibleContent className="space-y-0.5 pt-0.5">
            {group.children.map((child) => renderGroupChild(child))}
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  };

  const renderMenuEntry = (entry: MenuEntry) => {
    if (entry.kind === "link") {
      if (!sidebarOpen) {
        const active = isActiveRoute(location.pathname, entry.href);
        return (
          <Link
            key={entry.href}
            to={entry.href}
            title={entry.label}
            className={cn(
              "flex items-center justify-center min-h-[44px] w-full rounded-lg transition-all duration-200",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <entry.icon className="w-5 h-5 shrink-0" />
          </Link>
        );
      }
      return renderMenuLink(entry);
    }

    if (!sidebarOpen) return renderCollapsedGroup(entry);
    return renderExpandedGroup(entry);
  };

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex flex-col bg-sidebar transition-[width,transform] duration-300 ease-out touch-manipulation",
          "fixed inset-y-0 left-0 z-50 h-[100dvh] max-h-[100dvh] min-h-0 overflow-x-hidden shadow-xl lg:shadow-none",
          "pb-[env(safe-area-inset-bottom,0px)] pl-[max(0px,env(safe-area-inset-left,0px))]",
          sidebarOpen
            ? "translate-x-0 max-lg:w-[min(18rem,calc(100vw-0.75rem))] lg:w-[220px] min-[1920px]:lg:w-60"
            : "w-0 -translate-x-full border-0 overflow-hidden lg:overflow-visible lg:w-16 xl:w-20 lg:translate-x-0",
        )}
      >
        <div className="h-14 sm:h-16 flex-shrink-0 flex items-center justify-between px-3 sm:px-4 border-b border-sidebar-border gap-2">
          {sidebarOpen && <TopERPLogo variant="sidebar" showText={false} />}
          {!sidebarOpen && (
            <div className="mx-auto">
              <TopERPLogo variant="sidebar" showText={false} />
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors shrink-0"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 py-3 sm:py-4 px-2 sm:px-3 space-y-0.5 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-none overscroll-y-contain">
          {menuEntries.map((entry) => renderMenuEntry(entry))}
        </nav>
      </aside>

      <main
        className={cn(
          "min-h-[100dvh] min-w-0 flex flex-col transition-[padding] duration-300 ease-out",
          "pr-[max(0px,env(safe-area-inset-right,0px))]",
          sidebarOpen
            ? "lg:pl-[220px] min-[1920px]:lg:pl-60"
            : "lg:pl-16 xl:pl-20",
        )}
      >
        <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={toggleSidebar}
              className="lg:hidden touch-target min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-secondary text-foreground transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 sm:p-1 min-h-[44px] min-w-[44px] sm:min-w-0 rounded-full hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full primary-gradient flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {getUserInitials()}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.nome || "Usuário"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    {user?.role && (
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        {user.role === "ADMIN" && "Administrador"}
                        {user.role === "GERENTE" && "Gerente"}
                        {user.role === "VENDEDOR" && "Vendedor"}
                        {user.role === "FINANCEIRO" && "Financeiro"}
                        {user.role === "SUPER_ADMIN" && "Super Administrador"}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(user?.role === "ADMIN" || user?.role === "GERENTE") && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Gerenciar Usuários
                      </Link>
                    </DropdownMenuItem>
                    {isSuperAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center cursor-pointer">
                          <Shield className="mr-2 h-4 w-4" />
                          Painel Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="min-w-0 min-h-0 flex flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
