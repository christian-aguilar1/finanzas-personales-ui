import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  ConfirmacionAsistente, EstadoAsistente, MensajeAsistente, RespuestaAsistente,
} from '../models/asistente.model';

@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/asistente`;

  obtenerEstado() {
    return this.http.get<EstadoAsistente>(`${this.url}/estado`);
  }

  conversar(mensaje: string, historial: MensajeAsistente[]) {
    return this.http.post<RespuestaAsistente>(`${this.url}/chat`, {
      mensaje, historial: historial.slice(-12).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
    });
  }

  confirmar(id: string) {
    return this.http.post<ConfirmacionAsistente>(
      `${this.url}/propuestas/${encodeURIComponent(id)}/confirmar`, {},
    );
  }
}
