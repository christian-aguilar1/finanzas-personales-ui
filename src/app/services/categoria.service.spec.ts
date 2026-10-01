import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { CategoriaService } from './categoria.service';

describe('CategoriaService', () => {
  let service: CategoriaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CategoriaService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CategoriaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('pide las categorias sin userId en la URL', () => {
    service.obtenerCategorias().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/categorias`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('devuelve lista vacía cuando el backend responde 204 sin body', () => {
    let resultado: unknown[] | undefined;

    service.obtenerCategorias().subscribe((categorias) => (resultado = categorias));
    httpMock
      .expectOne(`${environment.apiUrl}/categorias`)
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(resultado).toEqual([]);
  });

  it('elimina sin mandar userId', () => {
    service.eliminarCategoria(3).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/categorias/3/eliminar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.has('userId')).toBeFalse();
    req.flush(null);
  });
});
