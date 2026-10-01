import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Cuenta } from '../../models/cuenta.model';
import { CuadreGastos } from '../../models/cuadre.model';
import { CuentaService } from '../../services/cuenta.service';
import { CuadreService } from '../../services/cuadre.service';

import { CuadreComponent } from './cuadre';

describe('CuadreComponent', () => {
  let component: CuadreComponent;
  let fixture: ComponentFixture<CuadreComponent>;

  const cuentas: Cuenta[] = [
    { id: 1, nombre: 'Tarjeta Banco Falabella', tipo: 'CREDITO', saldoInicial: 0 },
    { id: 35, nombre: 'CC Banco Chile', tipo: 'DEBITO', saldoInicial: 100 },
  ];

  const cuadre: CuadreGastos = {
    cuentaId: 1,
    cuentaNombre: 'Tarjeta Banco Falabella',
    periodo: '2026-09',
    total: 500000,
    cantidadTransacciones: 2,
    cantidadComprasEnCuotas: 1,
    totalComprasEnCuotas: 120000,
    incluyeCuotaCero: false,
    porCategoria: [{ id: 79, nombre: 'Mercadería', total: 500000, cantidad: 2 }],
    porComercio: [{ id: 7, nombre: 'Falabella', total: 500000, cantidad: 2 }],
    transacciones: [
      {
        id: 1,
        fecha: '2026-09-05',
        monto: 380000,
        tipo: 'EGRESO',
        descripcion: 'Compra tienda',
        cuotaActual: null,
        totalCuotas: null,
        categoriaPadreId: 79,
        categoriaPadreNombre: 'Mercadería',
      },
      {
        id: 2,
        fecha: '2026-09-09',
        monto: 120000,
        tipo: 'EGRESO',
        descripcion: 'Compra en cuotas',
        cuotaActual: 2,
        totalCuotas: 6,
        categoriaPadreId: 79,
        categoriaPadreNombre: 'Mercadería',
      },
    ],
  };

  function configurar(cuentasRespuesta: Cuenta[], cuadreRespuesta: CuadreGastos | null): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CuadreComponent],
      providers: [
        provideRouter([]),
        {
          provide: CuentaService,
          useValue: {
            obtenerCuentas: () => of(cuentasRespuesta),
          },
        },
        {
          provide: CuadreService,
          useValue: {
            obtenerCuadre: () => of(cuadreRespuesta),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(CuadreComponent);
    component = fixture.componentInstance;
  }

  it('should create', () => {
    configurar([], null);
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('arranca sin cuenta seleccionada y sin consultar el backend', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();

    expect(component.cuentaIdSeleccionada).toBeNull();
    expect(component.cuadre).toBeNull();
  });

  it('debe mostrar el periodo actual por defecto', () => {
    configurar([], null);
    fixture.detectChanges();

    expect(component.periodoSeleccionado).toMatch(/^\d{4}-\d{2}$/);
  });

  it('carga el cuadre de la cuenta y periodo por defecto', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();

    component.cuentaIdSeleccionada = 1;
    component.cargar();

    expect(component.cuadre?.total).toBe(500000);
    expect(component.cuadre?.cantidadTransacciones).toBe(2);
    expect(component.obtenerTransacciones().length).toBe(2);
  });

  it('selecciona sola la cuenta cuando hay una sola disponible', () => {
    configurar([cuentas[0]], cuadre);
    fixture.detectChanges();

    expect(component.cuentaIdSeleccionada).toBe(1);
    expect(component.cuadre?.total).toBe(500000);
  });

  it('cambiar el toggle vuelve a consultar', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();

    const espia = spyOn(component['cuadreService'], 'obtenerCuadre').and.returnValue(of(cuadre));
    component.cuentaIdSeleccionada = 1;

    component.incluyeCuotaCero = true;
    component.cargar();

    expect(espia).toHaveBeenCalledWith(1, component.periodoSeleccionado, true);
  });

  it('muestra estado vacío sin cuenta seleccionada', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Elegí una cuenta para ver sus transacciones del periodo.');
  });

  it('no muestra diferencia si no se ingresa monto', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();
    component.cuentaIdSeleccionada = 1;
    component.cargar();

    expect(component.hayMontoIngresado()).toBeFalse();
    expect(component.obtenerDiferencia()).toBe(0);
    expect(component.losMontosCuadran()).toBeFalse();
  });

  it('detecta cuando el monto ingresado coincide con el total', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();
    component.cuentaIdSeleccionada = 1;
    component.cargar();

    component.montoIngresado = 500000;

    expect(component.obtenerDiferencia()).toBe(0);
    expect(component.losMontosCuadran()).toBeTrue();
    expect(component.obtenerMensajeCuadre()).toContain('coincide');
  });

  it('cuadra con una diferencia de hasta 10 pesos', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();
    component.cuentaIdSeleccionada = 1;
    component.cargar();

    component.montoIngresado = 500007;

    expect(component.obtenerDiferencia()).toBe(7);
    expect(component.losMontosCuadran()).toBeTrue();
    expect(component.obtenerMensajeCuadre()).toContain('coincide');
  });

  it('no cuadra cuando la diferencia supera los 10 pesos', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();
    component.cuentaIdSeleccionada = 1;
    component.cargar();

    component.montoIngresado = 500011;

    expect(component.obtenerDiferencia()).toBe(11);
    expect(component.losMontosCuadran()).toBeFalse();
    expect(component.obtenerMensajeCuadre()).toContain('faltan');
  });

  it('cuadra con 10 pesos de diferencia a favor de la app', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();
    component.cuentaIdSeleccionada = 1;
    component.cargar();

    component.montoIngresado = 499990;

    expect(component.obtenerDiferencia()).toBe(-10);
    expect(component.losMontosCuadran()).toBeTrue();
  });

  it('detecta el monto que falta por registrar', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();
    component.cuentaIdSeleccionada = 1;
    component.cargar();

    component.montoIngresado = 505000;

    expect(component.obtenerDiferencia()).toBe(5000);
    expect(component.losMontosCuadran()).toBeFalse();
    expect(component.obtenerMensajeCuadre()).toContain('5.000');
  });

  it('detecta el monto de mas en la app', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();
    component.cuentaIdSeleccionada = 1;
    component.cargar();

    component.montoIngresado = 495000;

    expect(component.obtenerDiferencia()).toBe(-5000);
    expect(component.obtenerMensajeCuadre()).toContain('de más');
  });

  it('limpiar el monto vuelve al estado sin diferencia', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();
    component.cuentaIdSeleccionada = 1;
    component.cargar();
    component.montoIngresado = 505000;

    component.limpiarMontoIngresado();

    expect(component.montoIngresado).toBeNull();
    expect(component.hayMontoIngresado()).toBeFalse();
  });

  it('calcula el texto de cuotas como en transacciones', () => {
    configurar(cuentas, cuadre);
    fixture.detectChanges();

    expect(component.obtenerTextoCuotas(cuadre.transacciones[0])).toBe('1/1');
    expect(component.obtenerTextoCuotas(cuadre.transacciones[1])).toBe('2/6');
  });
});
