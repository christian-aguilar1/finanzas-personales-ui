import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CuadreGastos } from '../models/cuadre.model';

@Injectable({
  providedIn: 'root',
})
export class CuadreService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtenerCuadre(
    cuentaId: number,
    periodo: string,
    incluyeCuotaCero: boolean,
  ): Observable<CuadreGastos | null> {
    const params = new HttpParams()
      .set('cuentaId', cuentaId.toString())
      .set('periodo', periodo)
      .set('incluyeCuotaCero', incluyeCuotaCero ? 'true' : 'false');
    return this.http.get<CuadreGastos | null>(`${this.apiUrl}/transacciones/cuadre`, {
      params,
    });
  }
}
