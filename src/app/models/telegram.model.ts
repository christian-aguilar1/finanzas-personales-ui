export interface EstadoTelegram {
  disponible: boolean;
  vinculado: boolean;
  botUsername: string | null;
  telegramUsername: string | null;
  vinculadoEn: string | null;
  asistenteDisponible: boolean;
}

export interface EnlaceTelegram {
  url: string;
  expiraEn: string;
}
