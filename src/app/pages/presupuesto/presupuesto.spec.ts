import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PaginaTransacciones } from '../../models/transaccion.model';
import { Cuenta } from '../../models/cuenta.model';
import { TransaccionService } from '../../services/transaccion.service';
import { CuentaService } from '../../services/cuenta.service';

import { PresupuestoComponent } from './presupuesto';

describe('PresupuestoComponent', () => {
  let component: PresupuestoComponent;
  let fixture: ComponentFixture<PresupuestoComponent>;

  const mockPaginaVacia: PaginaTransacciones = {
    _embedded: {
      transaccionResponseList: [],
    },
    _links: {
      self: { href: 'http://localhost' },
    },
    page: {
      size: 10,
      totalElements: 0,
      totalPages: 1,
      number: 0,
    },
  };

  const mockCuentasVacio: Cuenta[] = [];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresupuestoComponent],
      providers: [
        {
          provide: TransaccionService,
          useValue: {
            obtenerTransaccionesPorPeriodoFacturacion: () => of(mockPaginaVacia),
          },
        },
        {
          provide: CuentaService,
          useValue: {
            obtenerCuentas: () => of(mockCuentasVacio),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PresupuestoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar el periodo actual por defecto', () => {
    expect(component.periodoSeleccionado).toMatch(/^\d{4}-\d{2}$/);
  });

  describe('filtro cuotaActual = 0, rollup de categorias hijas y compras en cuotas', () => {
    const pagina: PaginaTransacciones = {
      _embedded: {
        transaccionResponseList: [
          {
            id: 1, fecha: '2026-09-05', monto: 10000, tipo: 'EGRESO', cuotaActual: 1, totalCuotas: 3,
            categoriaId: 79, categoriaNombre: 'Mercadería', categoriaEsHija: false,
            categoriaPadreId: 79, categoriaPadreNombre: 'Mercadería',
          },
          {
            id: 2, fecha: '2026-09-07', monto: 20000, tipo: 'EGRESO', cuotaActual: 0, totalCuotas: 3,
            categoriaId: 79, categoriaNombre: 'Mercadería', categoriaEsHija: false,
            categoriaPadreId: 79, categoriaPadreNombre: 'Mercadería',
          },
          {
            id: 3, fecha: '2026-09-08', monto: 5000, tipo: 'INGRESO', cuotaActual: null,
            categoriaId: 75, categoriaNombre: 'Sueldo', categoriaEsHija: false,
            categoriaPadreId: 75, categoriaPadreNombre: 'Sueldo',
          },
          {
            id: 4, fecha: '2026-09-09', monto: 7777, tipo: 'EGRESO', cuotaActual: 2, totalCuotas: 3,
            categoriaId: 2, categoriaNombre: 'Compras', categoriaEsHija: false,
            categoriaPadreId: 2, categoriaPadreNombre: 'Compras',
          },
          {
            id: 5, fecha: '2026-09-10', monto: 3000, tipo: 'EGRESO', cuotaActual: null,
            categoriaId: 78, categoriaNombre: 'Negocio', categoriaEsHija: true,
            categoriaPadreId: 79, categoriaPadreNombre: 'Mercadería',
          },
        ],
      },
      _links: { self: { href: 'http://localhost' } },
      page: { size: 10, totalElements: 5, totalPages: 1, number: 0 },
    };

    const cuentas: Cuenta[] = [
      { id: 35, nombre: 'CC Banco Chile', tipo: 'DEBITO', saldoInicial: 318177 },
      { id: 34, nombre: 'TC Tenpo', tipo: 'EFECTIVO', saldoInicial: 0 },
      { id: 1, nombre: 'Tarjeta Banco Falabella', tipo: 'CREDITO', saldoInicial: 50000 },
    ];

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PresupuestoComponent],
        providers: [
          {
          provide: TransaccionService,
          useValue: {
            obtenerTransaccionesPorPeriodoFacturacion: () => of(pagina),
          },
          },
          {
            provide: CuentaService,
            useValue: {
              obtenerCuentas: () => of(cuentas),
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PresupuestoComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('no cuenta en el total las transacciones con cuotaActual 0 pero si las de categoria hija', () => {
      expect(component.egresoTotal).toBe(20777);
      expect(component.ingresoTotal).toBe(323177);
      expect(component.obtenerTotalFinal()).toBe(302400);
    });

    it('cuenta las transacciones con cuotaActual mayor a 0', () => {
      const enCuotas = component.transacciones.filter((item) => (item.cuotaActual ?? 0) > 0);
      expect(enCuotas.length).toBe(2);
      expect(enCuotas.map((item) => item.monto)).toEqual([10000, 7777]);
    });

    it('suma el saldo inicial de las cuentas DEBITO y EFECTIVO como ingreso', () => {
      expect(component.ingresoTotal).toBe(5000 + 318177);
      expect(component.obtenerTotalFinal()).toBe(5000 + 318177 - 20777);
    });

    it('muestra el saldo inicial como fila de ingresos', () => {
      const saldo = component.ingresosPorCategoria.find((item) => item.categoriaNombre === 'Saldo inicial');
      expect(saldo?.total).toBe(318177);
      expect(saldo?.cantidad).toBe(1);
    });

    it('no suma el saldo inicial de cuentas CREDITO', () => {
      const totalSaldoCreditos = cuentas
        .filter((cuenta) => cuenta.tipo === 'CREDITO')
        .reduce((total, cuenta) => total + Number(cuenta.saldoInicial ?? 0), 0);
      expect(totalSaldoCreditos).toBe(50000);
      const filaSaldo = component.ingresosPorCategoria.find((item) => item.categoriaNombre === 'Saldo inicial');
      expect(filaSaldo?.total).toBe(318177);
    });

    it('suma los montos de las categorias hijas dentro de su categoria padre', () => {
      const mercaderia = component.egresosPorCategoria.find((item) => item.categoriaNombre === 'Mercadería');
      expect(mercaderia?.total).toBe(3000);
      expect(mercaderia?.cantidad).toBe(1);
    });

    it('agrupa las compras en cuotas en su propia linea aunque tengan categoria', () => {
      const cuotas = component.egresosPorCategoria.find((item) => item.categoriaNombre === 'Compras en cuotas');
      expect(cuotas?.total).toBe(17777);
      expect(cuotas?.cantidad).toBe(2);
    });

    it('no muestra categorias hijas ni la categoria de una compra en cuotas como filas', () => {
      const nombres = component.egresosPorCategoria.map((item) => item.categoriaNombre);
      expect(nombres).not.toContain('Negocio');
      expect(nombres).not.toContain('Pan');
      expect(nombres).not.toContain('Compras');
      expect(nombres).toContain('Mercadería');
      expect(nombres).toContain('Compras en cuotas');
    });
  });
});

