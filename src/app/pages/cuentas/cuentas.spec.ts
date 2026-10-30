import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Cuenta } from '../../models/cuenta.model';
import { CuentaService } from '../../services/cuenta.service';

import { CuentasComponent } from './cuentas';

describe('CuentasComponent', () => {
  let component: CuentasComponent;
  let fixture: ComponentFixture<CuentasComponent>;
  let crearCuenta: jasmine.Spy;
  let actualizarCuenta: jasmine.Spy;

  const cuenta = (overrides: Partial<Cuenta> = {}): Cuenta => ({
    id: 1,
    nombre: 'Cuenta Corriente',
    tipo: 'DEBITO',
    saldoInicial: 318177,
    ...overrides,
  });

  const configurar = async (cuentas: Cuenta[]) => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [CuentasComponent],
      providers: [
        {
          provide: CuentaService,
          useValue: {
            obtenerCuentas: () => of(cuentas),
            crearCuenta,
            actualizarCuenta,
            eliminarCuenta: () => of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CuentasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    crearCuenta = jasmine.createSpy('crearCuenta').and.returnValue(of({}));
    actualizarCuenta = jasmine.createSpy('actualizarCuenta').and.returnValue(of({}));

    await configurar([]);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('el saldo inicial es editable en el formulario', () => {
    expect(component.cuentaForm.get('saldoInicial')).toBeTruthy();
    expect(component.cuentaForm.get('saldoInicial')?.disabled).toBeFalse();
  });

  it('rechaza un saldo inicial negativo', () => {
    component.cuentaForm.patchValue({ nombre: 'X', tipo: 'DEBITO', saldoInicial: -1 });

    expect(component.cuentaForm.get('saldoInicial')?.valid).toBeFalse();
  });

  it('crea la cuenta con el saldo inicial del formulario', () => {
    component.cuentaForm.patchValue({ nombre: 'Cuenta Corriente', tipo: 'DEBITO', saldoInicial: 318177 });

    component.guardarCuenta();

    expect(crearCuenta).toHaveBeenCalledTimes(1);
    expect(crearCuenta.calls.mostRecent().args[0].saldoInicial).toBe(318177);
  });

  it('al editar carga el saldo inicial de la cuenta en el formulario', async () => {
    await configurar([cuenta()]);

    component.editarCuenta(cuenta());

    expect(component.cuentaForm.get('saldoInicial')?.value).toBe(318177);
  });

  it('al editar no pisa el saldo inicial con 0', async () => {
    await configurar([cuenta()]);

    component.editarCuenta(cuenta());
    component.guardarCuenta();

    expect(actualizarCuenta).toHaveBeenCalledTimes(1);
    expect(actualizarCuenta.calls.mostRecent().args[1].saldoInicial).toBe(318177);
  });

  it('respeta un saldo inicial editado a mano', async () => {
    await configurar([cuenta()]);

    component.editarCuenta(cuenta());
    component.cuentaForm.patchValue({ saldoInicial: 250000 });
    component.guardarCuenta();

    expect(actualizarCuenta.calls.mostRecent().args[1].saldoInicial).toBe(250000);
  });

  it('cancelar la edición no arrastra el saldo inicial anterior', async () => {
    await configurar([cuenta()]);

    component.editarCuenta(cuenta());
    component.cancelarEdicion();

    expect(component.cuentaForm.get('saldoInicial')?.value).toBe(0);
  });

  it('muestra el saldo inicial en el listado', async () => {
    await configurar([cuenta()]);

    const fila = (fixture.nativeElement as HTMLElement).querySelector('tbody tr');

    expect(fila?.textContent).toContain('318,177');
  });

  it('muestra el saldo calculado de cuentas propias sin presentar el crédito como efectivo', async () => {
    await configurar([
      cuenta({ saldoInicial: 70635, saldoActual: 170635 }),
      cuenta({ id: 2, nombre: 'Tarjeta', tipo: 'CREDITO', saldoInicial: 0, saldoActual: 0 }),
    ]);
    fixture.detectChanges();

    const filas = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(filas[0].textContent).toContain('170,635 CLP');
    expect(filas[1].textContent).toContain('Crédito · ver movimientos');
    expect(filas[1].textContent).not.toContain('0 CLP');
  });
});
