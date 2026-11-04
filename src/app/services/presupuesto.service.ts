import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {PresupuestoCategoria} from '../models/presupuesto.model';

@Injectable({providedIn: 'root'})
export class PresupuestoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(): Observable<PresupuestoCategoria[]> { return this.http.get<PresupuestoCategoria[]>(`${this.apiUrl}/presupuestos`); }
  guardar(categoriaId: number, montoMensual: number): Observable<PresupuestoCategoria> {
    return this.http.put<PresupuestoCategoria>(`${this.apiUrl}/presupuestos/${categoriaId}`, {montoMensual});
  }
  eliminar(categoriaId: number): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/presupuestos/${categoriaId}`); }
}
