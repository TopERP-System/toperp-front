import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCheck,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { notificationsService, Notification } from "@/services/notifications.service";

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return CheckCircle2;
    case "warning":
      return AlertCircle;
    case "error":
      return XCircle;
    case "info":
    default:
      return Info;
  }
};

const getNotificationColor = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return "text-cyan bg-cyan/10";
    case "warning":
      return "text-amber-500 bg-amber-500/10";
    case "error":
      return "text-destructive bg-destructive/10";
    case "info":
    default:
      return "text-azure bg-azure/10";
  }
};

const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Agora";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min atrás`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hora" : "horas"} atrás`;
  } else {
    return formatDate(date);
  }
};

export const Notifications = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Buscar notificações da API
  const { data: notifications = [], isLoading, error: notificationsError } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const apiNotifications = await notificationsService.listar();
        return apiNotifications;
      } catch (error: any) {
        // Se for erro 404, não há notificações (retorna array vazio)
        if (error?.response?.status === 404) {
          return [];
        }
        // Outros erros, loga mas retorna array vazio
        console.error('Erro ao buscar notificações:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos para buscar novas notificações
    refetchOnWindowFocus: true, // Atualiza quando o usuário volta para a aba
    retry: 1, // Tenta novamente apenas 1 vez em caso de erro
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mutation para marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.marcarComoLida(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error, id) => {
      console.error('Erro ao marcar notificação como lida:', error);
      // Atualiza localmente mesmo se a API falhar
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)) || []
      );
    },
  });

  // Mutation para marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.marcarTodasComoLidas(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Erro ao marcar todas como lidas:', error);
      // Atualiza localmente mesmo se a API falhar
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.map((n) => ({ ...n, read: true })) || []
      );
    },
  });

  // Mutation para remover notificação
  const removeMutation = useMutation({
    mutationFn: (id: string) => notificationsService.remover(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error, id) => {
      console.error('Erro ao remover notificação:', error);
      // Remove localmente mesmo se a API falhar
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.filter((n) => n.id !== id) || []
      );
    },
  });

  // Mutation para limpar todas
  const clearAllMutation = useMutation({
    mutationFn: () => notificationsService.removerTodas(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Erro ao limpar todas as notificações:', error);
      // Limpa localmente mesmo se a API falhar
      queryClient.setQueryData<Notification[]>(['notifications'], []);
    },
  });

  const markAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const removeNotification = (id: string) => {
    removeMutation.mutate(id);
  };

  const clearAll = () => {
    clearAllMutation.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-cyan rounded-full" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Notificações</h3>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan/10 text-cyan font-medium">
                  {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2 text-xs"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Marcar todas
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto">
            <AnimatePresence>
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Carregando notificações...</p>
                </div>
              ) : notificationsError ? (
                <div className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Erro ao carregar notificações</p>
                  <p className="text-xs mt-1">Tente novamente mais tarde</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const colorClass = getNotificationColor(notification.type);

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={cn(
                        "p-4 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer",
                        !notification.read && "bg-cyan/5"
                      )}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl;
                        }
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            colorClass
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p
                              className={cn(
                                "text-sm font-medium text-foreground",
                                !notification.read && "font-semibold"
                              )}
                            >
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-cyan shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

