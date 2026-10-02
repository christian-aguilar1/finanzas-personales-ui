import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Proyeccion } from '../../models/transaccion.model';
import { TransaccionService } from '../../services/transaccion.service';

import { ProyeccionComponent } from './proyeccion';

describe('ProyeccionComponent', () => {
  let component: ProyeccionComponent;
  let fixture: ComponentFixture<ProyeccionComponent>;
  let obtenerProyeccion: jasmine.Spy;

  const mockProyeccion: Proyeccion = {
    periodo: '2026-10',
    ingresoTotal: 100000,
    egresoTotal: 40000,
    total: 60000,
    ingresosPorCategoria: [{ categoriaPadreId: 75, categoriaNombre: 'Sueldo', total: 100000, cantidad: 1 }],
    egresosPorCategoria: [
      { categoriaPadreId: 1, categoriaNombre: 'Gastos Obligatorios', total: 30000, cantidad: 3 },
      { categoriaPadreId: null, categoriaNombre: 'Compras en cuotas', total: 10000, cantidad: 2 },
    ],
    transacciones: [
      {
        descripcion: 'Sueldo mensual',
        cuenta: 'Cuenta Corriente',
        categoria: 'Sueldo',
        cuota: null,
        fecha: '2026-09-30',
        monto: 100000,
        tipo: 'INGRESO',
      },
      {
        descripcion: 'BODEGA ACUENTA PANOTECA',
        cuenta: 'Visa Platinum',
        categoria: 'Compras en cuotas',
        cuota: '1/3',
        fecha: '2026-08-11',
        monto: 9573,
        tipo: 'EGRESO',
      },
      {
        descripcion: 'Arriendo',
        cuenta: 'Cuenta Corriente',
        categoria: 'Gastos Obligatorios',
        cuota: null,
        fecha: '2026-09-05',
        monto: 30000,
        tipo: 'EGRESO',
      },
    ],
  };

  beforeEach(async () => {
    obtenerProyeccion = jasmine.createSpy('obtenerProyeccion').and.returnValue(of(mockProyeccion));

    await TestBed.configureTestingModule({
      imports: [ProyeccionComponent],
      providers: [
        {
          provide: TransaccionService,
          useValue: { obtenerProyeccion },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProyeccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga la proyección del mes siguiente por defecto', () => {
    const ahora = new Date();
    const esperado = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    const periodo = `${esperado.getFullYear()}-${String(esperado.getMonth() + 1).padStart(2, '0')}`;

    expect(component.mes).toBe(esperado.getMonth() + 1);
    expect(component.anio).toBe(esperado.getFullYear());
    expect(obtenerProyeccion).toHaveBeenCalledWith(periodo);
  });

  it('expone los totales y el detalle de la proyección', () => {
    expect(component.proyeccion).toEqual(mockProyeccion);
    expect(component.obtenerTotal()).toBe(60000);
    expect(component.obtenerIngresos().length).toBe(1);
    expect(component.obtenerEgresos().length).toBe(2);
  });

  it('expone el detalle de transacciones proyectadas en el mismo orden del backend', () => {
    const transacciones = component.obtenerTransacciones();

    expect(transacciones.length).toBe(3);
    expect(transacciones[0].tipo).toBe('INGRESO');
    expect(transacciones[1].cuota).toBe('1/3');
    expect(transacciones[1].categoria).toBe('Compras en cuotas');
  });

  it('renderiza una fila por transacción proyectada con sus columnas', () => {
    const filas = fixture.nativeElement.querySelectorAll('.tabla-detalle tbody tr');

    expect(filas.length).toBe(3);
    expect(filas[0].textContent).toContain('Sueldo mensual');
    expect(filas[0].textContent).toContain('Sueldo');
    expect(filas[1].textContent).toContain('BODEGA ACUENTA PANOTECA');
    expect(filas[1].textContent).toContain('Visa Platinum');
    expect(filas[1].textContent).toContain('1/3');
    expect(filas[1].textContent).toContain('11-08-2026');
    expect(filas[2].textContent).toContain('Arriendo');
  });

  it('muestra guion cuando la proyección no tiene cuota', () => {
    const filas = fixture.nativeElement.querySelectorAll('.tabla-detalle tbody tr');

    expect(component.formatearCuota(null)).toBe('-');
    expect(filas[0].textContent).toContain('-');
  });

  it('formatea las fechas de la proyección en formato dd-mm-aaaa', () => {
    expect(component.formatearFecha('2026-09-30')).toBe('30-09-2026');
    expect(component.formatearFecha('')).toBe('-');
  });

  it('ofrece los 12 meses y los años desde el actual hasta 10 años más', () => {
    const anioActual = new Date().getFullYear();
    expect(component.meses.length).toBe(12);
    expect(component.meses[0].valor).toBe(1);
    expect(component.anios.length).toBe(11);
    expect(component.anios[0]).toBe(anioActual);
    expect(component.anios[10]).toBe(anioActual + 10);
  });

  it('consulta la proyección del periodo actual', () => {
    obtenerProyeccion.calls.reset();
    const ahora = new Date();
    const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    component.mes = ahora.getMonth() + 1;
    component.anio = ahora.getFullYear();

    component.cargarProyeccion();

    expect(component.esPeriodoDisponible()).toBeTrue();
    expect(obtenerProyeccion).toHaveBeenCalledWith(periodo);
    expect(component.proyeccion).toEqual(mockProyeccion);
  });

  it('no consulta ni muestra proyección para periodos pasados', () => {
    obtenerProyeccion.calls.reset();
    const ahora = new Date();
    const anterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    component.mes = anterior.getMonth() + 1;
    component.anio = anterior.getFullYear();

    component.cargarProyeccion();

    expect(obtenerProyeccion).not.toHaveBeenCalled();
    expect(component.esPeriodoDisponible()).toBeFalse();
    expect(component.proyeccion).toBeNull();
  });

  it('distingue el periodo en curso de los futuros', () => {
    const enCurso = new Date();
    component.mes = enCurso.getMonth() + 1;
    component.anio = enCurso.getFullYear();

    expect(component.esPeriodoEnCurso()).toBeTrue();

    const futuro = new Date(enCurso.getFullYear(), enCurso.getMonth() + 1, 1);
    component.mes = futuro.getMonth() + 1;
    component.anio = futuro.getFullYear();
    expect(component.esPeriodoEnCurso()).toBeFalse();
  });

  it('menciona los movimientos ya registrados solo en el mes en curso', () => {
    const enCurso = new Date();
    component.mes = enCurso.getMonth() + 1;
    component.anio = enCurso.getFullYear();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.header p').textContent).toContain('ya registraste este mes');

    const futuro = new Date(enCurso.getFullYear(), enCurso.getMonth() + 1, 1);
    component.mes = futuro.getMonth() + 1;
    component.anio = futuro.getFullYear();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.header p').textContent).not.toContain('ya registraste este mes');
  });

  it('vuelve a consultar al cambiar el mes o el año', () => {
    obtenerProyeccion.calls.reset();
    component.anio = new Date().getFullYear() + 5;
    component.cargarProyeccion();
    component.mes = 6;
    component.cargarProyeccion();

    expect(obtenerProyeccion).toHaveBeenCalledTimes(2);
  });

  it('muestra un mensaje de error si la proyección falla', () => {
    obtenerProyeccion.and.returnValue(throwError(() => new Error('fallo')));
    spyOn(console, 'error');

    component.cargarProyeccion();

    expect(component.error).toContain('No se pudo calcular la proyección');
    expect(component.cargando).toBeFalse();
  });
});
