import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Comercio, ComercioRequest } from '../models/comercio.model';

@Injectable({ providedIn: 'root' })
export class ComercioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/comercios`;

  obtenerComercios() {
    return this.http.get<Comercio[] | null>(this.url).pipe(map(comercios => comercios ?? []));
  }

  crearComercio(request: ComercioRequest) {
    return this.http.post<Comercio>(this.url, request);
  }
}
