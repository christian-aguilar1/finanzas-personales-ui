import { TransaccionRequest } from './transaccion.model';

export interface EstadoAsistente {
  disponible: boolean;
  mensaje: string;
}

export interface MensajeAsistente {
  role: 'user' | 'assistant';
  content: string;
}

export interface PropuestaAsistente {
  id: string;
  expiraEn: string;
  transaccion: TransaccionRequest;
  cuentaNombre: string;
  categoriaNombre: string;
}

export interface RespuestaAsistente {
  respuesta: string;
  propuestas: PropuestaAsistente[];
}

export interface ConfirmacionAsistente {
  transaccionId: number;
  yaConfirmada: boolean;
}
