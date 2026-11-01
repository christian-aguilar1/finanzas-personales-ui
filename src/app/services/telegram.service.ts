import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { EnlaceTelegram, EstadoTelegram } from '../models/telegram.model';

@Injectable({ providedIn: 'root' })
export class TelegramService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/telegram`;

  obtenerEstado() { return this.http.get<EstadoTelegram>(`${this.url}/estado`); }
  crearEnlace() { return this.http.post<EnlaceTelegram>(`${this.url}/vincular`, {}); }
  desvincular() { return this.http.post<void>(`${this.url}/desvincular`, {}); }
}
