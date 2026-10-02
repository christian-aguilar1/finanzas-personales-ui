import {Injectable} from '@angular/core';
import {FiltroTransacciones, ModoBusquedaTransacciones} from '../models/transaccion.model';

@Injectable({
  providedIn: 'root',
})
export class FiltroService {
  private readonly STORAGE_KEY = 'transacciones_filtros';

  guardarFiltros(filtros: FiltroTransacciones, modoBusqueda: ModoBusquedaTransacciones): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({filtros, modoBusqueda}));
  }

  obtenerFiltros(): {filtros: FiltroTransacciones; modoBusqueda: ModoBusquedaTransacciones} | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  limpiarFiltros(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
