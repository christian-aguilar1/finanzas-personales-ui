import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { TransaccionService } from '../../services/transaccion.service';
import { CuentaService } from '../../services/cuenta.service';
import { CategoriaService } from '../../services/categoria.service';
import { Transaccion } from '../../models/transaccion.model';
import { MatSort } from '@angular/material/sort';
import { FiltroService } from '../../services/filtro.service';

import { TransaccionesComponent } from './transacciones';

describe('TransaccionesComponent', () => {
  let component: TransaccionesComponent;
  let fixture: ComponentFixture<TransaccionesComponent>;
  let transaccionServiceSpy: jasmine.SpyObj<TransaccionService>;

  const crearPaginaMock = (transacciones: Transaccion[], pageNumber: number = 0, totalPages: number = 1) => ({
    transacciones,
    paginacion: {
      totalPages,
      totalElements: transacciones.length * totalPages,
      currentPage: pageNumber,
      pageSize: 10,
    },
  });

  const configurarMockFiltros = (transaccionesMock: Transaccion[]) => {
    transaccionServiceSpy.obtenerTransacciones.and.callFake((page, size, filtros, sort) => {
      let resultado = transaccionesMock;
      if (filtros) {
        if (filtros.tipo && filtros.tipo !== 'TODOS') {
          resultado = resultado.filter(t => t.tipo === filtros.tipo);
        }
        if (filtros.mesFacturacion && filtros.mesFacturacion !== 'TODOS') {
          resultado = resultado.filter(t => {
            const mes = t.periodoFacturacion ? t.periodoFacturacion.split('-')[1] : '';
            return mes === filtros.mesFacturacion;
          });
        }
        if (filtros.modoFecha === 'RANGO' && filtros.fechaDesde && filtros.fechaHasta) {
          resultado = resultado.filter(t => t.fecha >= filtros.fechaDesde! && t.fecha <= filtros.fechaHasta!);
        }
      }
      return of(crearPaginaMock(resultado));
    });
  };

  beforeEach(async () => {
    transaccionServiceSpy = jasmine.createSpyObj<TransaccionService>('TransaccionService', ['obtenerTransacciones']);
    transaccionServiceSpy.obtenerTransacciones.and.returnValue(of(crearPaginaMock([])));

    await TestBed.configureTestingModule({
      imports: [TransaccionesComponent],
      providers: [
        { provide: TransaccionService, useValue: transaccionServiceSpy },
        { provide: CuentaService, useValue: { obtenerCuentas: () => of([]) } },
        { provide: CategoriaService, useValue: { obtenerCategorias: () => of([]) } },
        provideRouter([]),
        { provide: FiltroService, useValue: { obtenerFiltros: () => null, guardarFiltros: () => {}, limpiarFiltros: () => {} } },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TransaccionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe filtrar por tipo desde la primera página', () => {
    const transaccionesMock: Transaccion[] = Array.from({ length: 10 }, (_, index): Transaccion => ({
      id: index + 1,
      fecha: new Date().toISOString(),
      monto: 1000 + index,
      tipo: index % 2 === 0 ? 'EGRESO' : 'INGRESO',
      periodoFacturacion: '2026-03',
    }));

    configurarMockFiltros(transaccionesMock);

    component.ngOnInit();
    component.filtros.tipo = 'EGRESO';
    component.aplicarFiltros();

    expect(component.transaccionesFiltradas.length).toBe(5);
    expect(component.transaccionesFiltradas.every((item) => item.tipo === 'EGRESO')).toBeTrue();
  });

  it('debe filtrar por mes de facturacion', () => {
    const transaccionesMock: Transaccion[] = [
      { id: 1, fecha: '2026-01-10', periodoFacturacion: '2026-01', monto: 1000, tipo: 'INGRESO' },
      { id: 2, fecha: '2026-02-15', periodoFacturacion: '2026-02', monto: 2000, tipo: 'EGRESO' },
    ];

    configurarMockFiltros(transaccionesMock);

    component.ngOnInit();
    component.modoBusqueda = 'PERIODO_FACTURACION';
    component.filtros.mesFacturacion = '01';
    component.aplicarFiltros();

    expect(component.transaccionesFiltradas.length).toBe(1);
    expect(component.transaccionesFiltradas[0].id).toBe(1);
  });

  it('debe filtrar por fecha de transaccion cuando el modo es fecha', () => {
    const transaccionesMock: Transaccion[] = [
      { id: 1, fecha: '2026-03-01', periodoFacturacion: '2026-01', monto: 1000, tipo: 'INGRESO' },
      { id: 2, fecha: '2026-03-10', periodoFacturacion: '2026-02', monto: 1500, tipo: 'EGRESO' },
      { id: 3, fecha: '2026-03-20', periodoFacturacion: '2026-03', monto: 1800, tipo: 'EGRESO' },
    ];

    configurarMockFiltros(transaccionesMock);

    component.ngOnInit();
    component.modoBusqueda = 'FECHA_TRANSACCION';
    component.filtros.modoFecha = 'RANGO';
    component.filtros.fechaDesde = '2026-03-05';
    component.filtros.fechaHasta = '2026-03-15';
    component.aplicarFiltros();

    expect(component.transaccionesFiltradas.length).toBe(1);
    expect(component.transaccionesFiltradas[0].id).toBe(2);
  });

  it('debe filtrar por rango exacto de fechas', () => {
    const transaccionesMock: Transaccion[] = [
      { id: 1, fecha: '2026-03-01', monto: 1000, tipo: 'INGRESO' },
      { id: 2, fecha: '2026-03-10', monto: 1500, tipo: 'EGRESO' },
      { id: 3, fecha: '2026-03-20', monto: 1800, tipo: 'EGRESO' },
    ];

    configurarMockFiltros(transaccionesMock);

    component.ngOnInit();
    component.filtros.modoFecha = 'RANGO';
    component.filtros.fechaDesde = '2026-03-05';
    component.filtros.fechaHasta = '2026-03-15';
    component.aplicarFiltros();

    expect(component.transaccionesFiltradas.length).toBe(1);
    expect(component.transaccionesFiltradas[0].id).toBe(2);
  });

  it('debe ordenar datos usando dataSource', () => {
    const transaccionesMock: Transaccion[] = [
      { id: 1, fecha: '2026-03-01', monto: 100, tipo: 'INGRESO' },
      { id: 2, fecha: '2026-03-02', monto: 500, tipo: 'EGRESO' },
    ];
    component.dataSource.data = transaccionesMock;
    const sort = new MatSort();
    sort.active = 'monto';
    sort.direction = 'asc';
    component.dataSource.sort = sort;
    component.dataSource.sortData(component.dataSource.data, sort);

    expect(component.dataSource.connect().value[0].monto).toBe(100);

    sort.direction = 'desc';
    component.dataSource.sortData(component.dataSource.data, sort);
    expect(component.dataSource.connect().value[0].monto).toBe(500);
  });

  describe('eliminación de transacciones', () => {
    const transaccion: Transaccion = { id: 7, fecha: '2026-09-05', monto: 1000, tipo: 'EGRESO' };

    beforeEach(() => {
      transaccionServiceSpy.eliminarTransaccion = jasmine.createSpy('eliminarTransaccion');
      transaccionServiceSpy.eliminarTransaccion.and.returnValue(of(void 0));
      spyOn(window, 'confirm').and.returnValue(true);
    });

    it('envía solo el id de la transacción', () => {
      component.eliminarTransaccion(transaccion);

      expect(transaccionServiceSpy.eliminarTransaccion).toHaveBeenCalledWith(7);
    });

    it('no llama al servicio si el usuario cancela la confirmación', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);

      component.eliminarTransaccion(transaccion);

      expect(transaccionServiceSpy.eliminarTransaccion).not.toHaveBeenCalled();
    });

    it('muestra el mensaje del backend cuando rechaza el borrado', () => {
      transaccionServiceSpy.eliminarTransaccion.and.returnValue(
        throwError(() => ({ error: { message: 'No tienes permiso para eliminar esta transacción' } }))
      );

      component.eliminarTransaccion(transaccion);

      expect(component.error).toContain('No tienes permiso');
      expect(component.cargandoTransacciones).toBeFalse();
    });
  });
});

