import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Observable, forkJoin, of } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { Cuenta } from '../../models/cuenta.model';
import { FiltroTransacciones, Transaccion } from '../../models/transaccion.model';
import { CuentaService } from '../../services/cuenta.service';
import { TemaService } from '../../services/tema.service';
import { TransaccionService } from '../../services/transaccion.service';

Chart.register(...registerables);

const MESES_VENTANA = 6;
const TAMANO_PAGINA = 100;
const MAX_PAGINAS = 20;
const CATEGORIAS_VISIBLES = 5;
const ULTIMAS_TRANSACCIONES = 5;
const SIN_CATEGORIA = 'Sin categoría';

const COLORES_SERIE = [
  '#3b82f6',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
];

interface PuntoMensual {
  periodo: string;
  etiqueta: string;
  ingresos: number;
  egresos: number;
}

interface CategoriaGasto {
  nombre: string;
  total: number;
  cantidad: number;
}

interface TarjetaMetrica {
  clave: string;
  titulo: string;
  valor: number;
  detalle: string;
  tono: 'positivo' | 'negativo' | 'neutro';
  esPorcentaje: boolean;
}

interface Indicador {
  clave: string;
  titulo: string;
  valor: string;
  detalle: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  @ViewChild('graficoTendencia') graficoTendenciaRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoCategorias') graficoCategoriasRef?: ElementRef<HTMLCanvasElement>;

  private chartTendencia?: Chart;
  private chartCategorias?: Chart;

  private readonly transaccionService = inject(TransaccionService);
  private readonly cuentaService = inject(CuentaService);
  private readonly temaService = inject(TemaService);
  private readonly router = inject(Router);

  readonly cargando = signal(true);
  readonly error = signal('');
  readonly transacciones = signal<Transaccion[]>([]);
  readonly cuentas = signal<Cuenta[]>([]);

  private readonly hoy = new Date();
  private readonly periodosVentana = Inicio.crearPeriodos(this.hoy, MESES_VENTANA);
  private readonly filtrosVentana: Partial<FiltroTransacciones> = {
    modoBusqueda: 'FECHA_TRANSACCION',
    fechaDesde: `${Inicio.periodoDe(this.hoy, -(MESES_VENTANA - 1))}-01`,
    fechaHasta: Inicio.fechaIso(this.hoy),
  };

  readonly periodoActual = Inicio.periodoDe(this.hoy);
  readonly periodoPrevio = Inicio.periodoDe(this.hoy, -1);
  readonly etiquetaVentana = `${Inicio.etiquetaDePeriodo(this.periodosVentana[0])} – ${Inicio.etiquetaDePeriodo(
    this.periodosVentana[this.periodosVentana.length - 1],
  )}`;

  constructor() {
    // Los charts se redibujan al cambiar los datos o el tema para heredar los tokens del layout.
    effect(() => {
      this.serieMensual();
      this.categoriasGasto();
      this.temaService.esOscuro();

      if (this.cargando() || this.error()) {
        return;
      }

      setTimeout(() => this.renderizarGraficos());
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destruirCharts();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      transacciones: this.cargarVentana(),
      cuentas: this.cuentaService.obtenerCuentas(),
    }).subscribe({
      next: (resultado) => {
        this.transacciones.set(resultado.transacciones);
        this.cuentas.set(resultado.cuentas ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.transacciones.set([]);
        this.cuentas.set([]);
        this.error.set('No se pudieron cargar los datos del resumen.');
        this.cargando.set(false);
      },
    });
  }

  agregarTransaccion(): void {
    this.router.navigate(['/transaccion']);
  }

  verTransacciones(): void {
    this.router.navigate(['/transacciones']);
  }

  verPresupuesto(): void {
    this.router.navigate(['/presupuesto']);
  }

  verCuentas(): void {
    this.router.navigate(['/cuentas']);
  }

  /** Una base recién creada no tiene cuentas: el resumen tiene que decirlo, no mostrar ceros. */
  readonly sinCuentas = computed(() => !this.cargando() && !this.error() && this.cuentas().length === 0);

  readonly sinMovimientos = computed(
    () => !this.cargando() && !this.error() && !this.sinCuentas() && this.transacciones().length === 0,
  );

  /** `cuotaActual === 0` es una cuota que todavía no se imputa: se excluye igual que en el presupuesto. */
  private readonly imputables = computed(() => this.transacciones().filter((item) => item.cuotaActual !== 0));

  readonly resumenMes = computed(() => {
    const actual = this.resumir(this.periodoActual);
    const previo = this.resumir(this.periodoPrevio);

    return {
      ingresos: actual.ingresos,
      egresos: actual.egresos,
      balance: actual.ingresos - actual.egresos,
      ingresosPrevio: previo.ingresos,
      egresosPrevio: previo.egresos,
      movimientos: actual.cantidad,
      variacionBalance: this.variacion(actual.ingresos - actual.egresos, previo.ingresos - previo.egresos),
      tasaAhorro: actual.ingresos > 0 ? ((actual.ingresos - actual.egresos) / actual.ingresos) * 100 : null,
    };
  });

  readonly tarjetas = computed<TarjetaMetrica[]>(() => {
    const mes = this.resumenMes();
    const variacion = mes.variacionBalance;

    return [
      {
        clave: 'ingresos',
        titulo: 'Ingresos del mes',
        valor: mes.ingresos,
        detalle: `Mes anterior: ${Inicio.miles(mes.ingresosPrevio)}`,
        tono: 'positivo',
        esPorcentaje: false,
      },
      {
        clave: 'egresos',
        titulo: 'Egresos del mes',
        valor: mes.egresos,
        detalle: `Mes anterior: ${Inicio.miles(mes.egresosPrevio)}`,
        tono: 'negativo',
        esPorcentaje: false,
      },
      {
        clave: 'balance',
        titulo: 'Balance del mes',
        valor: mes.balance,
        detalle:
          variacion === null
            ? 'Sin base comparable con el mes anterior'
            : `${Inicio.conSigno(variacion, 1)} % vs. mes anterior`,
        tono: mes.balance >= 0 ? 'positivo' : 'negativo',
        esPorcentaje: false,
      },
      {
        clave: 'ahorro',
        titulo: 'Tasa de ahorro',
        valor: mes.tasaAhorro ?? 0,
        detalle: mes.tasaAhorro === null ? 'Sin ingresos en el mes' : 'Del ingreso de este mes',
        tono: (mes.tasaAhorro ?? 0) >= 0 ? 'positivo' : 'negativo',
        esPorcentaje: true,
      },
    ];
  });

  /** El contrato no trae serie mensual agregada: la tendencia se arma con los movimientos de la ventana. */
  readonly serieMensual = computed<PuntoMensual[]>(() => {
    const totales = new Map<string, { ingresos: number; egresos: number }>(
      this.periodosVentana.map((periodo) => [periodo, { ingresos: 0, egresos: 0 }]),
    );

    for (const item of this.imputables()) {
      const destino = totales.get(Inicio.periodoDeTransaccion(item));

      if (!destino) {
        continue;
      }

      if (item.tipo === 'INGRESO') {
        destino.ingresos += Number(item.monto ?? 0);
      } else {
        destino.egresos += Number(item.monto ?? 0);
      }
    }

    return this.periodosVentana.map((periodo) => ({
      periodo,
      etiqueta: Inicio.etiquetaDePeriodo(periodo),
      ingresos: totales.get(periodo)?.ingresos ?? 0,
      egresos: totales.get(periodo)?.egresos ?? 0,
    }));
  });

  readonly categoriasGasto = computed<CategoriaGasto[]>(() => {
    const acumulado = new Map<string, CategoriaGasto>();

    for (const item of this.imputables()) {
      if (item.tipo !== 'EGRESO' || Inicio.periodoDeTransaccion(item) !== this.periodoActual) {
        continue;
      }

      const nombre = item.categoriaNombre?.trim() || SIN_CATEGORIA;
      const monto = Number(item.monto ?? 0);
      const actual = acumulado.get(nombre);

      if (actual) {
        actual.total += monto;
        actual.cantidad += 1;
      } else {
        acumulado.set(nombre, { nombre, total: monto, cantidad: 1 });
      }
    }

    const ordenadas = [...acumulado.values()].sort((a, b) => b.total - a.total);

    if (ordenadas.length <= CATEGORIAS_VISIBLES + 1) {
      return ordenadas;
    }

    const resto = ordenadas.slice(CATEGORIAS_VISIBLES);

    return [
      ...ordenadas.slice(0, CATEGORIAS_VISIBLES),
      {
        nombre: 'Otras',
        total: resto.reduce((total, item) => total + item.total, 0),
        cantidad: resto.reduce((total, item) => total + item.cantidad, 0),
      },
    ];
  });

  readonly ultimasTransacciones = computed<Transaccion[]>(() =>
    [...this.transacciones()]
      .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '') || b.id - a.id)
      .slice(0, ULTIMAS_TRANSACCIONES),
  );

  readonly indicadores = computed<Indicador[]>(() => {
    const delMes = this.imputables().filter((item) => Inicio.periodoDeTransaccion(item) === this.periodoActual);
    const serie = this.serieMensual();
    const mesesConMovimientos = serie.filter((punto) => punto.ingresos > 0 || punto.egresos > 0).length;
    const enCuotas = delMes.filter((item) => (item.cuotaActual ?? 0) > 0 && item.totalCuotas != null);
    const totalEgresos = serie.reduce((total, punto) => total + punto.egresos, 0);

    return [
      {
        clave: 'promedio',
        titulo: 'Gasto promedio mensual',
        valor: Inicio.miles(mesesConMovimientos > 0 ? totalEgresos / mesesConMovimientos : 0),
        detalle: mesesConMovimientos === 1 ? '1 mes con movimientos' : `${mesesConMovimientos} meses con movimientos`,
      },
      {
        clave: 'cuotas',
        titulo: 'Cuotas del mes',
        valor: Inicio.miles(enCuotas.reduce((total, item) => total + Number(item.monto ?? 0), 0)),
        detalle: enCuotas.length === 1 ? '1 cuota activa' : `${enCuotas.length} cuotas activas`,
      },
      {
        clave: 'movimientos',
        titulo: 'Movimientos del mes',
        valor: String(delMes.length),
        detalle: `${this.imputables().length} en los últimos ${MESES_VENTANA} meses`,
      },
      {
        clave: 'cuentas',
        titulo: 'Cuentas registradas',
        valor: String(this.cuentas().length),
        detalle: 'Total de cuentas del perfil',
      },
    ];
  });

  readonly hayTendencia = computed(() =>
    this.serieMensual().some((punto) => punto.ingresos > 0 || punto.egresos > 0),
  );

  readonly totalCategorias = computed(() => this.categoriasGasto().reduce((total, item) => total + item.total, 0));

  porcentaje(total: number): number {
    return this.totalCategorias() > 0 ? (total / this.totalCategorias()) * 100 : 0;
  }

  /** La leyenda usa la misma paleta que el doughnut para que no puedan desalinearse. */
  colorSerie(indice: number): string {
    const categorias = this.categoriasGasto();

    if (categorias.length > CATEGORIAS_VISIBLES && indice === categorias.length - 1) {
      return this.token('--app-border-2', '#cbd5e1');
    }

    return COLORES_SERIE[indice % COLORES_SERIE.length];
  }

  fechaCorta(fecha: string | undefined): string {
    return fecha && fecha.length >= 10 ? `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}` : '—';
  }

  private resumir(periodo: string) {
    const delPeriodo = this.imputables().filter((item) => Inicio.periodoDeTransaccion(item) === periodo);
    const sumar = (tipo: Transaccion['tipo']) =>
      delPeriodo.filter((item) => item.tipo === tipo).reduce((total, item) => total + Number(item.monto ?? 0), 0);

    return { ingresos: sumar('INGRESO'), egresos: sumar('EGRESO'), cantidad: delPeriodo.length };
  }

/** Un cambio de signo no se puede expresar como porcentaje: se omite en vez de inventar un número. */
  private variacion(actual: number, previo: number): number | null {
    if (previo === 0 || (actual > 0 && previo < 0) || (actual < 0 && previo > 0)) {
      return null;
    }

    return ((actual - previo) / Math.abs(previo)) * 100;
  }

  private cargarVentana(pagina: number = 0, acumuladas: Transaccion[] = []): Observable<Transaccion[]> {
    return this.transaccionService.obtenerTransacciones(pagina, TAMANO_PAGINA, this.filtrosVentana).pipe(
      concatMap((resultado) => {
        const actuales = [...acumuladas, ...(resultado.transacciones ?? [])];
        const totalPaginas = resultado.paginacion?.totalPages ?? 0;

        if (totalPaginas <= 0 || pagina + 1 >= totalPaginas || pagina + 1 >= MAX_PAGINAS) {
          return of(actuales);
        }

        return this.cargarVentana(pagina + 1, actuales);
      }),
    );
  }

  private renderizarGraficos(): void {
    this.renderizarTendencia();
    this.renderizarCategorias();
  }

  private renderizarTendencia(): void {
    this.chartTendencia?.destroy();
    this.chartTendencia = undefined;

    if (!this.graficoTendenciaRef?.nativeElement || !this.hayTendencia()) {
      return;
    }

    const serie = this.serieMensual();
    const exacto = new Intl.NumberFormat('es-CL');
    const compacto = new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 });
    const ejes = { color: this.token('--app-text-muted', '#64748b') };

    this.chartTendencia = new Chart(this.graficoTendenciaRef.nativeElement, {
      type: 'bar',
      data: {
        labels: serie.map((punto) => punto.etiqueta),
        datasets: [
          {
            label: 'Ingresos',
            data: serie.map((punto) => punto.ingresos),
            backgroundColor: this.token('--app-success', '#16a34a'),
            borderRadius: 6,
            maxBarThickness: 32,
          },
          {
            label: 'Egresos',
            data: serie.map((punto) => punto.egresos),
            backgroundColor: this.token('--app-danger', '#dc2626'),
            borderRadius: 6,
            maxBarThickness: 32,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 14, usePointStyle: true, boxWidth: 8, color: this.token('--app-text-2', '#334155') },
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${exacto.format(context.parsed.y as number)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: ejes },
          y: {
            beginAtZero: true,
            grid: { color: this.token('--app-border', '#e2e8f0') },
            ticks: { ...ejes, callback: (value) => compacto.format(Number(value)) },
          },
        },
      },
    });
  }

  private renderizarCategorias(): void {
    this.chartCategorias?.destroy();
    this.chartCategorias = undefined;

    const categorias = this.categoriasGasto();

    if (!this.graficoCategoriasRef?.nativeElement || categorias.length === 0) {
      return;
    }

    const exacto = new Intl.NumberFormat('es-CL');

    this.chartCategorias = new Chart(this.graficoCategoriasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: categorias.map((item) => item.nombre),
        datasets: [
          {
            data: categorias.map((item) => item.total),
            backgroundColor: categorias.map((_, indice) => this.colorSerie(indice)),
            borderWidth: 2,
            borderColor: this.token('--app-surface', '#ffffff'),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${exacto.format(context.parsed as number)}`,
            },
          },
        },
      },
    });
  }

  private destruirCharts(): void {
    this.chartTendencia?.destroy();
    this.chartTendencia = undefined;
    this.chartCategorias?.destroy();
    this.chartCategorias = undefined;
  }

  private token(nombre: string, porDefecto: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || porDefecto;
  }

  private static readonly monto = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

  private static miles(valor: number): string {
    return Inicio.monto.format(valor);
  }

  private static conSigno(valor: number, decimales: number): string {
    const texto = new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(valor);

    return `${valor > 0 ? '+' : ''}${texto}`;
  }

  private static periodoDeTransaccion(item: Transaccion): string {
    const periodo = item.periodoFacturacion?.trim() ?? '';
    return (periodo.length >= 7 ? periodo : (item.fecha ?? '')).slice(0, 7);
  }

  private static periodoDe(fecha: Date, desplazamiento: number = 0): string {
    const total = fecha.getFullYear() * 12 + fecha.getMonth() + desplazamiento;
    const anio = Math.floor(total / 12);
    return `${anio}-${String((total % 12) + 1).padStart(2, '0')}`;
  }

  private static fechaIso(fecha: Date): string {
    return `${Inicio.periodoDe(fecha)}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  private static crearPeriodos(hoy: Date, cantidad: number): string[] {
    return Array.from({ length: cantidad }, (_, indice) => Inicio.periodoDe(hoy, indice - (cantidad - 1)));
  }

  private static etiquetaDePeriodo(periodo: string): string {
    const [anio, mes] = periodo.split('-');
    const etiqueta = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(
      new Date(Number(anio), Number(mes) - 1, 1),
    );

    return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);
  }
}