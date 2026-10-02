import { Injectable } from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {Cuenta, CuentaRequest} from '../models/cuenta.model';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CuentaService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtenerCuentas(): Observable<Cuenta[]> {
    // El backend deduce el usuario del access token. Un 204 sin body llega como null.
    return this.http
      .get<Cuenta[] | null>(`${this.apiUrl}/cuentas`)
      .pipe(map((cuentas) => cuentas ?? []));
  }

  crearCuenta(request: CuentaRequest): Observable<Cuenta> {
    return this.http.post<Cuenta>(`${this.apiUrl}/cuentas`, request);
  }

  actualizarCuenta(id: number, request: CuentaRequest): Observable<Cuenta> {
    return this.http.put<Cuenta>(`${this.apiUrl}/cuentas/${id}`, request);
  }

  eliminarCuenta(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cuentas/${id}`);
  }
}
