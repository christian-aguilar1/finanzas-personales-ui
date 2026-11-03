import { TransaccionRequest } from './transaccion.model';
import { Nota } from './nota.model';

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
  notaGuardada?: Nota | null;
}

export interface ConfirmacionAsistente {
  transaccionId: number;
  yaConfirmada: boolean;
}
