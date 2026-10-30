import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Cuenta } from '../../models/cuenta.model';
import { Transaccion } from '../../models/transaccion.model';
import { CuentaService } from '../../services/cuenta.service';
import { TemaService } from '../../services/tema.service';
import { TransaccionService } from '../../services/transaccion.service';

import { Inicio } from './inicio';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;
  let router: Router;

  const ahora = new Date();
  const periodoActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const periodoPrevio = `${new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).getFullYear()}-${String(
    new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).getMonth() + 1,
  ).padStart(2, '0')}`;

  const dia = (periodo: string) => `${periodo}-15`;

  const ingreso = (id: number, monto: number, periodo: string, overrides: Partial<Transaccion> = {}): Transaccion => ({
    id,
    fecha: dia(periodo),
    periodoFacturacion: periodo,
    monto,
    tipo: 'INGRESO',
    descripcion: `Ingreso ${id}`,
    categoriaNombre: 'Sueldo',
    ...overrides,
  });

  const egreso = (id: number, monto: number, periodo: string, overrides: Partial<Transaccion> = {}): Transaccion => ({
    id,
    fecha: dia(periodo),
    periodoFacturacion: periodo,
    monto,
    tipo: 'EGRESO',
    descripcion: `Egreso ${id}`,
    categoriaNombre: 'Arriendo',
    ...overrides,
  });

  const cuentas: Cuenta[] = [{ id: 1, nombre: 'Cuenta corriente', tipo: 'DEBITO', saldoInicial: 100000 }];

  const pagina = (transacciones: Transaccion[], page: number, totalPages: number) => ({
    transacciones,
    paginacion: {
      totalPages,
      totalElements: transacciones.length,
      currentPage: page,
      pageSize: 100,
    },
  });

  const configurar = async (transaccionesPorPagina: Transaccion[][], cuentasRespuesta: Cuenta[] = cuentas) => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideRouter([]),
        {
          provide: TransaccionService,
          useValue: {
            obtenerTransacciones: (page: number) =>
              of(
                pagina(
                  transaccionesPorPagina[page] ?? [],
                  page,
                  transaccionesPorPagina.length > 0 ? transaccionesPorPagina.length : 0,
                ),
              ),
          },
        },
        { provide: CuentaService, useValue: { obtenerCuentas: () => of(cuentasRespuesta) } },
        { provide: TemaService, useValue: { esOscuro: signal(false) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await configurar([[ingreso(1, 500000, periodoActual), egreso(2, 120000, periodoActual)]], cuentas);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el saldo disponible por cuenta incluso sin movimientos del mes', async () => {
    await configurar([[]], [
      { id: 1, nombre: 'CC Banco Chile', tipo: 'DEBITO', saldoInicial: 70635, saldoActual: 120635 },
      { id: 2, nombre: 'Ahorro', tipo: 'AHORRO', saldoInicial: 30000, saldoActual: 30000 },
      { id: 3, nombre: 'Tarjeta', tipo: 'CREDITO', saldoInicial: 0, saldoActual: 0 },
    ]);
    fixture.detectChanges();

    expect(component.totalDisponible()).toBe(150635);
    const saldos = (fixture.nativeElement as HTMLElement).querySelector('.saldos');
    expect(saldos?.textContent).toContain('CC Banco Chile');
    expect(saldos?.textContent).toContain('120,635');
    expect(saldos?.textContent).toContain('150,635');
    expect(saldos?.textContent).not.toContain('Tarjeta 0');
  });

  it('debe navegar a ingresar transaccion', () => {
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    component.agregarTransaccion();
    expect(navegar).toHaveBeenCalledWith(['/transaccion']);
  });

  it('debe navegar a ver transacciones', () => {
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    component.verTransacciones();
    expect(navegar).toHaveBeenCalledWith(['/transacciones']);
  });

  it('calcula ingresos, egresos y balance del mes', () => {
    const resumen = component.resumenMes();

    expect(resumen.ingresos).toBe(500000);
    expect(resumen.egresos).toBe(120000);
    expect(resumen.balance).toBe(380000);
    expect(resumen.tasaAhorro).toBe(76);
    expect(resumen.movimientos).toBe(2);
  });

  it('expone cuatro tarjetas con el detalle del mes anterior', () => {
    const tarjetas = component.tarjetas();

    expect(tarjetas.length).toBe(4);
    expect(tarjetas[0].titulo).toBe('Ingresos del mes');
    expect(tarjetas[2].valor).toBe(380000);
    expect(tarjetas[3].esPorcentaje).toBeTrue();
  });

  it('no cuenta en los totales las transacciones con cuotaActual 0', async () => {
    await configurar([
      [
        ingreso(1, 500000, periodoActual),
        egreso(2, 120000, periodoActual),
        egreso(3, 90000, periodoActual, { cuotaActual: 0, totalCuotas: 6 }),
      ],
    ]);

    expect(component.resumenMes().egresos).toBe(120000);
  });

  it('compara el balance contra el mes anterior', async () => {
    await configurar([
      [ingreso(1, 500000, periodoActual), egreso(2, 120000, periodoActual), ingreso(4, 200000, periodoPrevio)],
    ]);

    const resumen = component.resumenMes();

    expect(resumen.ingresosPrevio).toBe(200000);
    expect(resumen.egresosPrevio).toBe(0);
    expect(resumen.variacionBalance).toBeCloseTo(90, 5);
    expect(component.tarjetas()[2].detalle).toBe('+90,0 % vs. mes anterior');
  });

  it('no calcula variación si el balance cambia de signo', async () => {
    await configurar([
      [ingreso(1, 500000, periodoActual), egreso(2, 120000, periodoActual), egreso(4, 100000, periodoPrevio)],
    ]);

    expect(component.resumenMes().variacionBalance).toBeNull();
    expect(component.tarjetas()[2].detalle).toBe('Sin base comparable con el mes anterior');
  });

  it('serie mensual de 6 meses con los movimientos de cada periodo', async () => {
    await configurar([
      [
        ingreso(1, 500000, periodoActual),
        egreso(2, 120000, periodoActual),
        ingreso(5, 300000, periodoPrevio, { fecha: '2026-01-10', periodoFacturacion: periodoPrevio }),
      ],
    ]);

    const serie = component.serieMensual();

    expect(serie.length).toBe(6);
    expect(serie[serie.length - 1].periodo).toBe(periodoActual);
    expect(serie[serie.length - 1].ingresos).toBe(500000);
    expect(serie[serie.length - 1].egresos).toBe(120000);
    expect(serie[serie.length - 2].ingresos).toBe(300000);
    expect(serie[serie.length - 2].etiqueta.length).toBeGreaterThan(0);
  });

  it('acumula todas las páginas de la ventana', async () => {
    await configurar([
      [ingreso(1, 500000, periodoActual), egreso(2, 120000, periodoActual)],
      [egreso(6, 30000, periodoActual, { categoriaNombre: 'Supermercado' })],
    ]);

    expect(component.transacciones().length).toBe(3);
    expect(component.ultimasTransacciones().length).toBe(3);
    expect(component.categoriasGasto().length).toBe(2);
  });

  it('agrupa egresos por categoría y ordena de mayor a menor', async () => {
    await configurar([
      [
        egreso(1, 120000, periodoActual, { categoriaNombre: 'Arriendo' }),
        egreso(2, 45000, periodoActual, { categoriaNombre: 'Supermercado' }),
        egreso(3, 20000, periodoActual, { categoriaNombre: 'Arriendo' }),
      ],
    ]);

    const categorias = component.categoriasGasto();

    expect(categorias[0].nombre).toBe('Arriendo');
    expect(categorias[0].total).toBe(140000);
    expect(categorias[0].cantidad).toBe(2);
    expect(categorias[1].nombre).toBe('Supermercado');
    expect(component.totalCategorias()).toBe(185000);
    expect(component.porcentaje(140000)).toBeCloseTo(75.67, 1);
  });

  it('resume las categorías que no alcanzan el corte en Otras', async () => {
    await configurar([
      Array.from({ length: 8 }, (_, indice) =>
        egreso(indice + 1, 10000 * (indice + 1), periodoActual, { categoriaNombre: `Categoría ${indice + 1}` }),
      ),
    ]);

    const categorias = component.categoriasGasto();

    expect(categorias.length).toBe(6);
    expect(categorias[5].nombre).toBe('Otras');
    expect(categorias[5].total).toBe(10000 + 20000 + 30000);
  });

  it('solo considera egresos del mes actual en el gráfico', async () => {
    await configurar([
      [
        egreso(1, 120000, periodoActual, { categoriaNombre: 'Arriendo' }),
        egreso(2, 99000, periodoPrevio, { categoriaNombre: 'Vacaciones' }),
      ],
    ]);

    expect(component.categoriasGasto().map((item) => item.nombre)).toEqual(['Arriendo']);
  });

  it('muestra el estado inicial cuando no hay cuentas', async () => {
    await configurar([[ingreso(1, 1000, periodoActual)]], []);

    expect(component.sinCuentas()).toBeTrue();
    expect(component.sinMovimientos()).toBeFalse();
    expect(component.cuentas().length).toBe(0);
  });

  it('muestra el estado inicial cuando hay cuentas pero no movimientos', async () => {
    await configurar([]);

    expect(component.sinCuentas()).toBeFalse();
    expect(component.sinMovimientos()).toBeTrue();
    expect(component.hayTendencia()).toBeFalse();
  });

  it('expone cuatro indicadores de la ventana', () => {
    const indicadores = component.indicadores();

    expect(indicadores.length).toBe(4);
    expect(indicadores[2].valor).toBe('2');
    expect(indicadores[3].valor).toBe('1');
    expect(indicadores[0].valor).toBe('120.000');
  });

  it('cuenta las cuotas activas del mes entre los indicadores', async () => {
    await configurar([
      [
        egreso(1, 30000, periodoActual, { cuotaActual: 2, totalCuotas: 6, categoriaNombre: 'Tienda' }),
        egreso(2, 10000, periodoActual, { cuotaActual: 0, totalCuotas: 3, categoriaNombre: 'Tienda' }),
      ],
    ]);

    const cuotas = component.indicadores().find((item) => item.clave === 'cuotas');

    expect(cuotas?.valor).toBe('30.000');
    expect(cuotas?.detalle).toBe('1 cuota activa');
  });

it('expone el error y limpia los datos si la carga falla', async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideRouter([]),
        {
          provide: TransaccionService,
          useValue: { obtenerTransacciones: () => throwError(() => new Error('sin red')) },
        },
        { provide: CuentaService, useValue: { obtenerCuentas: () => of(cuentas) } },
        { provide: TemaService, useValue: { esOscuro: signal(false) } },
      ],
    }).compileComponents();

    const fixtureConError = TestBed.createComponent(Inicio);
    fixtureConError.detectChanges();

    expect(fixtureConError.componentInstance.error()).toContain('No se pudieron cargar');
    expect(fixtureConError.componentInstance.cargando()).toBeFalse();
    expect(fixtureConError.componentInstance.transacciones().length).toBe(0);
  });

  it('formatea la fecha corta sin desfase de zona horaria', () => {
    expect(component.fechaCorta('2026-03-07')).toBe('07/03/2026');
    expect(component.fechaCorta(undefined)).toBe('—');
  });

  describe('estados del template', () => {
    it('pinta el dashboard con tarjetas, charts, movimientos y accesos', () => {
      const elementos = fixture.nativeElement as HTMLElement;

      expect(elementos.querySelectorAll('.tarjeta').length).toBe(4);
      expect(elementos.querySelectorAll('.indicador').length).toBe(4);
      expect(elementos.querySelector('.panel__titulo')?.textContent).toContain('Ingresos y egresos por mes');
      expect(elementos.querySelectorAll('.movimiento').length).toBe(2);
      expect(elementos.querySelectorAll('.atajo').length).toBe(3);
      expect(elementos.querySelectorAll('.leyenda__fila').length).toBe(1);
    });

    it('dibuja los dos canvas cuando hay datos', (done) => {
      // El effect redibuja los charts en un setTimeout: se espera a que termine.
      setTimeout(() => {
        const tendency = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
        const anillo = fixture.nativeElement.querySelectorAll('canvas')[1] as HTMLCanvasElement;

        expect(tendency.width).toBeGreaterThan(0);
        expect(tendency.height).toBeGreaterThan(0);
        expect(anillo.width).toBeGreaterThan(0);
        expect(anillo.height).toBeGreaterThan(0);
        done();
      }, 50);
    });

    it('muestra el aviso de cuenta faltante en vez de ceros', async () => {
      await configurar([[ingreso(1, 1000, periodoActual)]], []);
      fixture.detectChanges();

      const elementos = fixture.nativeElement as HTMLElement;

      expect(elementos.querySelector('.aviso__titulo')?.textContent).toContain('Empieza creando una cuenta');
      expect(elementos.querySelectorAll('.tarjeta').length).toBe(0);
      expect(elementos.querySelector('a[href="/cuentas"]')).toBeTruthy();
    });

    it('muestra el aviso sin movimientos', async () => {
      await configurar([]);

      const elementos = fixture.nativeElement as HTMLElement;

      expect(elementos.querySelector('.aviso__titulo')?.textContent).toContain('Todavía no hay movimientos');
      expect(elementos.querySelectorAll('.movimiento').length).toBe(0);
    });

    it('muestra el aviso de error con reintento', async () => {
      TestBed.resetTestingModule();

      await TestBed.configureTestingModule({
        imports: [Inicio],
        providers: [
          provideRouter([]),
          { provide: TransaccionService, useValue: { obtenerTransacciones: () => throwError(() => new Error('x')) } },
          { provide: CuentaService, useValue: { obtenerCuentas: () => of(cuentas) } },
          { provide: TemaService, useValue: { esOscuro: signal(false) } },
        ],
      }).compileComponents();

      const fixtureConError = TestBed.createComponent(Inicio);
      fixtureConError.detectChanges();

      const elementos = fixtureConError.nativeElement as HTMLElement;

      expect(elementos.querySelector('[role="alert"]')).toBeTruthy();
      expect(elementos.textContent).toContain('Reintentar');
    });
  });
});
