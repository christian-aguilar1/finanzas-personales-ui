import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ComerciosComponent } from './comercios';
import { ComercioService } from '../../services/comercio.service';

describe('Comercios', () => {
  let servicio: jasmine.SpyObj<ComercioService>;
  beforeEach(() => {
    servicio = jasmine.createSpyObj('ComercioService', ['obtenerComercios', 'crearComercio']);
    servicio.obtenerComercios.and.returnValue(of([]));
    TestBed.configureTestingModule({ imports: [ComerciosComponent], providers: [{ provide: ComercioService, useValue: servicio }] });
  });

  it('muestra el estado vacío y rechaza nombres en blanco', () => {
    const fixture = TestBed.createComponent(ComerciosComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes comercios');
    fixture.componentInstance.formulario.patchValue({ nombre: '   ' });
    fixture.componentInstance.guardarComercio();
    expect(servicio.crearComercio).not.toHaveBeenCalled();
  });

  it('evita envíos duplicados y recarga el listado al guardar', () => {
    const pendiente = new Subject<any>();
    servicio.crearComercio.and.returnValue(pendiente);
    const fixture = TestBed.createComponent(ComerciosComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formulario.setValue({ nombre: ' Almacén ', rubro: ' ' });
    c.guardarComercio();
    c.guardarComercio();
    expect(servicio.crearComercio).toHaveBeenCalledOnceWith({ nombre: 'Almacén', rubro: null });
    servicio.obtenerComercios.and.returnValue(of([{ id: 1, nombre: 'Almacén', rubro: null }]));
    pendiente.next({ id: 1, nombre: 'Almacén', rubro: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin rubro');
    expect(c.formulario.controls.nombre.value).toBe('');
  });

  it('conserva el formulario cuando falla el guardado', () => {
    servicio.crearComercio.and.returnValue(throwError(() => new Error('sin conexión')));
    const c = TestBed.createComponent(ComerciosComponent).componentInstance;
    c.formulario.patchValue({ nombre: 'Almacén' });
    c.guardarComercio();
    expect(c.formulario.controls.nombre.value).toBe('Almacén');
    expect(c.guardando).toBeFalse();
    expect(c.errorGuardado).toContain('No se pudo agregar');
  });
});
