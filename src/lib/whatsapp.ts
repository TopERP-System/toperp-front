/**
 * Obtém a URL do WhatsApp do arquivo .env ou usa o valor padrão
 */
export const getWhatsAppUrl = (): string => {
  return import.meta.env.VITE_WHATSAPP_URL || 'https://wa.me/qr/BEXVIMSFVHYLK1';
};

/**
 * Abre o WhatsApp em uma nova aba
 */
export const openWhatsApp = (): void => {
  const url = getWhatsAppUrl();
  window.open(url, '_blank');
};

