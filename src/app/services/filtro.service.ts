import {Injectable} from '@angular/core';
import {FiltroTransacciones, ModoBusquedaTransacciones} from '../models/transaccion.model';

const MODOS: ModoBusquedaTransacciones[] = ['PERIODO_FACTURACION', 'FECHA_TRANSACCION'];

@Injectable({
  providedIn: 'root',
})
export class FiltroService {
  private readonly STORAGE_KEY = 'transacciones_filtros';

  guardarFiltros(filtros: FiltroTransacciones, modoBusqueda: ModoBusquedaTransacciones): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({filtros, modoBusqueda}));
  }

  /**
   * Si el almacenamiento quedó corrupto o con una forma inesperada, se descarta
   * en vez de propagar el error: la vista debe abrir con los filtros por defecto.
   */
  obtenerFiltros(): {filtros: FiltroTransacciones; modoBusqueda: ModoBusquedaTransacciones} | null {
    const data = localStorage.getItem(this.STORAGE_KEY);

    if (!data) {
      return null;
    }

    try {
      const guardado = JSON.parse(data);

      if (!guardado?.filtros || typeof guardado.filtros !== 'object') {
        this.limpiarFiltros();
        return null;
      }

      const modoBusqueda = MODOS.includes(guardado.modoBusqueda) ? guardado.modoBusqueda : 'PERIODO_FACTURACION';

      return {filtros: guardado.filtros as FiltroTransacciones, modoBusqueda};
    } catch {
      this.limpiarFiltros();
      return null;
    }
  }

  limpiarFiltros(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}