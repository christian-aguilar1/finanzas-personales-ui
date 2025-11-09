import { Injectable } from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {Categoria} from '../models/categoria.model';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CuentaService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtenerCuentasPorUsuario(userId: number): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/cuentas/porUsuario/${userId}`);
  }
}
