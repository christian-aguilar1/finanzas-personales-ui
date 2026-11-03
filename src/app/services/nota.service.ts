import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Nota, NotaRequest } from '../models/nota.model';

@Injectable({ providedIn: 'root' })
export class NotaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notas`;

  listar() { return this.http.get<Nota[]>(this.url); }
  proximas() { return this.http.get<Nota[]>(`${this.url}/proximas`); }
  crear(request: NotaRequest) { return this.http.post<Nota>(this.url, request); }
  actualizar(id: number, request: NotaRequest) { return this.http.put<Nota>(`${this.url}/${id}`, request); }
  eliminar(id: number) { return this.http.delete<void>(`${this.url}/${id}`); }
}
