import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CategoriaService } from '../../services/categoria.service';
import { CuentaService } from '../../services/cuenta.service';
import { TransaccionService } from '../../services/transaccion.service';

import { TransaccionComponent } from './transaccion';

const crearSnapshot = () => ({
  paramMap: { get: () => null },
  params: {},
  queryParams: {},
  fragment: null,
  matrixParams: {},
  url: [],
});

describe('Transaccion', () => {
  let component: TransaccionComponent;
  let fixture: ComponentFixture<TransaccionComponent>;
  let agregarTransaccion: jasmine.Spy;

  const categorias = [{ id: 3, nombre: 'Mercadería', tipo: 'EGRESO', parentId: null }];
  const cuentas = [{ id: 1, nombre: 'Cuenta Corriente', tipo: 'DEBITO' }];

  const crearComponente = (cuentasRespuesta: unknown[], categoriasRespuesta: unknown[]) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TransaccionComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: crearSnapshot() } },
        { provide: CategoriaService, useValue: { obtenerCategorias: () => of(categoriasRespuesta) } },
        { provide: CuentaService, useValue: { obtenerCuentas: () => of(cuentasRespuesta) } },
        { provide: TransaccionService, useValue: { agregarTransaccion } },
        { provide: MessageService, useValue: { add: jasmine.createSpy('add') } },
      ],
    });

    fixture = TestBed.createComponent(TransaccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    agregarTransaccion = jasmine.createSpy('agregarTransaccion').and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [TransaccionComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: crearSnapshot() } },
        { provide: CategoriaService, useValue: { obtenerCategorias: () => of(categorias) } },
        { provide: CuentaService, useValue: { obtenerCuentas: () => of(cuentas) } },
        { provide: TransaccionService, useValue: { agregarTransaccion } },
        { provide: MessageService, useValue: { add: jasmine.createSpy('add') } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransaccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('acepta la cuota 0 en una compra en cuotas', () => {
    component.transaccionForm.patchValue({
      tipo: 'EGRESO',
      cuenta: 1,
      monto: 230033,
      categoria: 3,
      esCompraCuotas: true,
      cuotaActual: 0,
      totalCuotas: 12,
    });

    expect(component.transaccionForm.get('cuotaActual')?.valid).toBeTrue();
    expect(component.transaccionForm.get('totalCuotas')?.valid).toBeTrue();
    expect(component.transaccionForm.valid).toBeTrue();
  });

  it('rechaza un numero de cuotas negativo', () => {
    component.transaccionForm.patchValue({
      tipo: 'EGRESO',
      cuenta: 1,
      monto: 1000,
      categoria: 3,
      esCompraCuotas: true,
      cuotaActual: -1,
      totalCuotas: 12,
    });

    expect(component.transaccionForm.get('cuotaActual')?.valid).toBeFalse();
  });

  it('guarda la transaccion sin subcategoria', () => {
    component.transaccionForm.patchValue({
      tipo: 'EGRESO',
      cuenta: 1,
      monto: 1000,
      categoria: 3,
      descripcion: 'Compra',
    });

    component.guardar();

    expect(agregarTransaccion).toHaveBeenCalledTimes(1);
    expect(agregarTransaccion.calls.mostRecent().args[0].subcategoriaId).toBeNull();
  });

  it('no manda el userId porque el backend lo deduce del token', () => {
    component.transaccionForm.patchValue({
      tipo: 'EGRESO',
      cuenta: 1,
      monto: 1000,
      categoria: 3,
    });

    component.guardar();

    expect(agregarTransaccion.calls.mostRecent().args[0].userId).toBeUndefined();
  });

  it('bloquea el guardado mientras no exista ninguna cuenta', () => {
    crearComponente([], categorias);
    agregarTransaccion.calls.reset();

    component.transaccionForm.patchValue({
      tipo: 'EGRESO',
      cuenta: 1,
      monto: 1000,
      categoria: 3,
    });

    expect(component.bloqueoConfiguracionInicial).toBeTrue();
    component.guardar();

    expect(agregarTransaccion).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes cuentas');
  });

  it('bloquea el guardado mientras no exista ninguna categoría', () => {
    crearComponente(cuentas, []);
    agregarTransaccion.calls.reset();

    expect(component.bloqueoConfiguracionInicial).toBeTrue();
    component.guardar();

    expect(agregarTransaccion).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes categorías');
  });

  it('permite guardar cuando hay al menos una cuenta y una categoría', () => {
    expect(component.bloqueoConfiguracionInicial).toBeFalse();

    component.transaccionForm.patchValue({
      tipo: 'EGRESO',
      cuenta: 1,
      monto: 1000,
      categoria: 3,
    });

    component.guardar();

    expect(agregarTransaccion).toHaveBeenCalledTimes(1);
  });
});
