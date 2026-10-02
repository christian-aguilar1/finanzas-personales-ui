import { Injectable } from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {Categoria, CategoriaRequest} from '../models/categoria.model';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtenerCategorias(): Observable<Categoria[]> {
    // El backend deduce el usuario del access token. Un 204 sin body llega como null.
    return this.http
      .get<Categoria[] | null>(`${this.apiUrl}/categorias`)
      .pipe(map((categorias) => categorias ?? []));
  }

  crearCategoria(request: CategoriaRequest): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.apiUrl}/categorias`, request);
  }

  actualizarCategoria(id: number, request: CategoriaRequest): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}/categorias/${id}`, request);
  }

  eliminarCategoria(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/categorias/${id}/eliminar`, null);
  }
}
