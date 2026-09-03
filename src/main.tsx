import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Inicializar utilitários de debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  import('@/lib/api-debug').then(() => {
    console.log('🔧 [Debug] Utilitários de debug da API carregados.');
    console.log('💡 Dica: Use debugApi() no console para diagnosticar problemas de conexão.');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
