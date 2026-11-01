import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Prestamo {
  transaccionId: number;
  persona: string;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  monto: number;
  devuelto: number;
  pendiente: number;
}

@Injectable({ providedIn: 'root' })
export class PrestamoService {
  constructor(private http: HttpClient) {}

  obtenerPrestamos(): Observable<Prestamo[]> {
    return this.http.get<Prestamo[]>(`${environment.apiUrl}/prestamos`);
  }
}
