import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {Observable} from 'rxjs';
import {
  CrearTransaccionRequest,
  FiltroTransacciones,
  PaginaTransacciones,
  Proyeccion,
  Transaccion,
  TransaccionRequest
} from '../models/transaccion.model';
import {map} from 'rxjs/operators';

export interface ResultadoPaginaTransacciones {
  transacciones: Transaccion[];
  paginacion: {
    totalPages: number;
    totalElements: number;
    currentPage: number;
    pageSize: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TransaccionService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  agregarTransaccion(request: CrearTransaccionRequest) {
    return this.http.post(`${this.apiUrl}/transacciones`, request);
  }

  actualizarTransaccion(id: number, request: TransaccionRequest) {
    return this.http.put(`${this.apiUrl}/transacciones/${id}`, request);
  }

  eliminarTransaccion(id: number) {
    return this.http.post<void>(`${this.apiUrl}/transacciones/${id}/eliminar`, null);
  }

  obtenerTransacciones(
    page: number = 0,
    size: number = 10,
    filtros?: Partial<FiltroTransacciones>,
    sort?: string
  ): Observable<ResultadoPaginaTransacciones> {
    const params = this.construirParamsPaginadas(page, size, filtros, sort);

    return this.http
      .get<PaginaTransacciones | null>(`${this.apiUrl}/transacciones`, { params })
      .pipe(
        map((pagina) => {
          const normalizada = this.normalizarPagina(pagina);

          return {
            transacciones: normalizada._embedded.transaccionResponseList,
            paginacion: {
              totalPages: normalizada.page.totalPages,
              totalElements: normalizada.page.totalElements,
              currentPage: normalizada.page.number,
              pageSize: normalizada.page.size
            }
          };
        })
      );
  }

  obtenerTransaccionesPorPeriodoFacturacion(
    periodoFacturacion: string,
    page: number = 0,
    size: number = 10
  ): Observable<PaginaTransacciones> {
    const params = new HttpParams()
      .set('periodoFacturacion', periodoFacturacion)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http
      .get<PaginaTransacciones | null>(`${this.apiUrl}/transacciones`, { params })
      .pipe(map((pagina) => this.normalizarPagina(pagina)));
  }

  obtenerProyeccion(periodo: string): Observable<Proyeccion> {
    const params = new HttpParams().set('periodo', periodo);

    return this.http.get<Proyeccion | null>(`${this.apiUrl}/transacciones/proyeccion`, { params }).pipe(
      map((proyeccion) =>
        proyeccion ?? {
          periodo,
          ingresoTotal: 0,
          egresoTotal: 0,
          total: 0,
          ingresosPorCategoria: [],
          egresosPorCategoria: [],
          transacciones: []
        }
      )
    );
  }

  private construirParamsPaginadas(
    page: number,
    size: number,
    filtros: Partial<FiltroTransacciones> | undefined,
    sort: string | undefined
  ): HttpParams {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (sort) {
      params = params.set('sort', sort);
    }

    if (!filtros) {
      return params;
    }

    const anioActual = new Date().getFullYear();

    if (filtros.tipo && filtros.tipo !== 'TODOS') {
      params = params.set('tipo', filtros.tipo);
    }
    if (filtros.cuentaId) {
      params = params.set('cuentaId', filtros.cuentaId.toString());
    }
    if (filtros.categoriaId) {
      params = params.set('categoriaId', filtros.categoriaId.toString());
    }
    if (filtros.mesFacturacion && filtros.mesFacturacion !== 'TODOS' && filtros.modoBusqueda === 'PERIODO_FACTURACION') {
      params = params.set('periodoFacturacion', `${anioActual}-${filtros.mesFacturacion}`);
    }
    if (filtros.modoBusqueda === 'FECHA_TRANSACCION') {
      if (filtros.fechaDesde) {
        params = params.set('fechaDesde', filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        params = params.set('fechaHasta', filtros.fechaHasta);
      }
    }

    return params;
  }

  /** El backend respondía 204 sin body para listas vacías: se normaliza a una página vacía. */
  private normalizarPagina(pagina: PaginaTransacciones | null): PaginaTransacciones {
    const transacciones = pagina?._embedded?.transaccionResponseList ?? [];
    const paginacion = pagina?.page;

    return {
      _embedded: { transaccionResponseList: transacciones },
      _links: pagina?._links ?? { self: { href: '' } },
      page: {
        size: paginacion?.size ?? transacciones.length,
        totalElements: paginacion?.totalElements ?? transacciones.length,
        totalPages: paginacion?.totalPages ?? (transacciones.length > 0 ? 1 : 0),
        number: paginacion?.number ?? 0
      }
    };
  }
}
