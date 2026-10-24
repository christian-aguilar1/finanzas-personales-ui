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
        { provide: TransaccionService, useValue: { agregarTransaccion, obtenerNombresRecurrentes: () => of([]) } },
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
        { provide: TransaccionService, useValue: { agregarTransaccion, obtenerNombresRecurrentes: () => of([]) } },
        { provide: MessageService, useValue: { add: jasmine.createSpy('add') } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransaccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exige nombre al marcar recurrente y acepta texto libre', () => {
    component.transaccionForm.patchValue({esRecurrente: true, nombreRecurrente: '   '});
    expect(component.transaccionForm.get('nombreRecurrente')?.invalid).toBeTrue();
    component.transaccionForm.patchValue({nombreRecurrente: 'Gasto común'});
    expect(component.transaccionForm.get('nombreRecurrente')?.valid).toBeTrue();
    component.transaccionForm.patchValue({nombreRecurrente: 'x'.repeat(101)});
    expect(component.transaccionForm.get('nombreRecurrente')?.invalid).toBeTrue();
    component.transaccionForm.patchValue({esRecurrente: false});
    expect(component.transaccionForm.get('nombreRecurrente')?.valid).toBeTrue();
  });

  it('sugiere por prefijo ignorando mayúsculas y tildes', () => {
    component.nombresRecurrentes = ['Gas', 'Gasto común', 'Luz'];
    component.transaccionForm.patchValue({nombreRecurrente: 'GÁ'});
    expect(component.sugerenciasRecurrentes).toEqual(['Gas', 'Gasto común']);
  });

  it('envía el nombre normalizado y null al desmarcar recurrente', () => {
    component.transaccionForm.patchValue({cuenta: 1, monto: 100, categoria: 3, esRecurrente: true, nombreRecurrente: ' Gasto   común '});
    component.guardar();
    expect(agregarTransaccion.calls.mostRecent().args[0].nombreRecurrente).toBe('Gasto común');
    component.transaccionForm.patchValue({esRecurrente: false});
    component.guardar();
    expect(agregarTransaccion.calls.mostRecent().args[0].nombreRecurrente).toBeNull();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marca como recurrente una transacción recurrente al cargarla para editar', () => {
    (component as unknown as { cargarTransaccionEnFormulario: (t: unknown) => void })
      .cargarTransaccionEnFormulario({
        id: 5,
        tipo: 'EGRESO',
        fecha: '2026-10-01',
        monto: 1000,
        esRecurrente: true,
      });

    expect(component.transaccionForm.value.esRecurrente).toBeTrue();
  });

  it('deja desmarcada una transacción que no es recurrente', () => {
    (component as unknown as { cargarTransaccionEnFormulario: (t: unknown) => void })
      .cargarTransaccionEnFormulario({
        id: 6,
        tipo: 'EGRESO',
        fecha: '2026-10-01',
        monto: 1000,
        esRecurrente: false,
      });

    expect(component.transaccionForm.value.esRecurrente).toBeFalse();
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

  describe('medio de pago', () => {
    const guardarConCuenta = (cuentaId: number) => {
      component.transaccionForm.patchValue({
        tipo: 'EGRESO',
        cuenta: cuentaId,
        monto: 1000,
        categoria: 3,
      });

      component.guardar();

      return agregarTransaccion.calls.mostRecent().args[0].medio;
    };

    it('usa el tipo de la cuenta seleccionada', () => {
      crearComponente(
        [
          { id: 1, nombre: 'Cuenta Corriente', tipo: 'DEBITO' },
          { id: 2, nombre: 'Billetera', tipo: 'EFECTIVO' },
          { id: 3, nombre: 'Tarjeta', tipo: 'CREDITO' },
        ],
        categorias,
      );
      agregarTransaccion.calls.reset();

      expect(guardarConCuenta(1)).toBe('DEBITO');
      expect(guardarConCuenta(2)).toBe('EFECTIVO');
      expect(guardarConCuenta(3)).toBe('CREDITO');
    });

    it('imputa una cuenta de ahorro como DEBITO', () => {
      crearComponente([{ id: 7, nombre: 'Ahorro', tipo: 'AHORRO' }], categorias);
      agregarTransaccion.calls.reset();

      expect(guardarConCuenta(7)).toBe('DEBITO');
    });

    it('una compra en cuotas siempre va como CREDITO', () => {
      crearComponente([{ id: 2, nombre: 'Billetera', tipo: 'EFECTIVO' }], categorias);
      agregarTransaccion.calls.reset();

      component.transaccionForm.patchValue({
        tipo: 'EGRESO',
        cuenta: 2,
        monto: 120000,
        categoria: 3,
        esCompraCuotas: true,
        cuotaActual: 1,
        totalCuotas: 12,
      });

      component.guardar();

      const request = agregarTransaccion.calls.mostRecent().args[0];

      expect(request.medio).toBe('CREDITO');
      expect(request.cuotaActual).toBe(1);
      expect(request.totalCuotas).toBe(12);
    });

    it('cae a EFECTIVO si la cuenta ya no está en el catálogo', () => {
      expect(guardarConCuenta(99)).toBe('EFECTIVO');
    });
  });
});
