import {CommonModule} from '@angular/common';
import {Component, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {forkJoin, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {Categoria} from '../../models/categoria.model';
import {Cuenta} from '../../models/cuenta.model';
import {
  FiltroTransacciones,
  PeriodoFiltro,
  Transaccion,
} from '../../models/transaccion.model';
import {CategoriaService} from '../../services/categoria.service';
import {CuentaService} from '../../services/cuenta.service';
import {TransaccionService} from '../../services/transaccion.service';
import {FiltroService} from '../../services/filtro.service';
import {MatTableModule, MatTableDataSource} from '@angular/material/table';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatSort, MatSortModule} from '@angular/material/sort';

@Component({
  selector: 'app-transacciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatTableModule, MatIconModule, MatButtonModule, MatSortModule],
  templateUrl: './transacciones.html',
  styleUrl: './transacciones.css',
})
export class TransaccionesComponent implements OnInit {
  @ViewChild(MatSort) set sort(v: MatSort) {
    if (v) {
      this.dataSource.sort = v;
      v.sortChange.subscribe((sort: { active: string, direction: string }) => {
        if (sort.direction) {
          this.sortState = `${sort.active},${sort.direction}`;
        } else {
          this.sortState = null;
        }
        this.aplicarFiltros();
      });
    }
  }

  /** Un usuario nuevo entra con cero cuentas: la tabla vacía no explica por qué. */
  get sinCuentas(): boolean {
    return !this.cargandoTransacciones && this.cuentas.length === 0;
  }

  columnasVisibles: string[] = ['monto', 'tipo', 'cuenta', 'categoria', 'periodoFacturacion', 'cuotas', 'fecha', 'acciones'];
  dataSource = new MatTableDataSource<Transaccion>();
  modoBusqueda: 'PERIODO_FACTURACION' | 'FECHA_TRANSACCION' = 'PERIODO_FACTURACION';
  sortState: string | null = null;

  cuentas: Cuenta[] = [];
  categorias: Categoria[] = [];
  transaccionesFiltradas: Transaccion[] = [];
  cargandoTransacciones = false;
  error = '';
  filtrando = false;
  paginaActual = 1;
  registrosPorPagina = 10;
  opcionesRegistrosPorPagina = [10, 50, 100];
  transaccionesTotales: Transaccion[] = [];
  terminoBusqueda = '';
  totalPaginasBackend = 1;

  private transacciones: Transaccion[] = [];
  private paginasEnCache: Map<number, Transaccion[]> = new Map();

  filtros: FiltroTransacciones = {
    modoBusqueda: 'PERIODO_FACTURACION',
    modoFecha: 'PREDEFINIDO',
    periodo: 'MES_ACTUAL',
    fechaDesde: null,
    fechaHasta: null,
    mesFacturacion: 'TODOS',
    tipo: 'TODOS',
    cuentaId: null,
    categoriaId: null,
  };

  readonly periodosDisponibles: Array<{ valor: PeriodoFiltro; etiqueta: string }> = [
    {valor: 'HOY', etiqueta: 'Hoy'},
    {valor: 'ULTIMOS_7_DIAS', etiqueta: 'Ultimos 7 dias'},
    {valor: 'ULTIMOS_30_DIAS', etiqueta: 'Ultimos 30 dias'},
    {valor: 'MES_ACTUAL', etiqueta: 'Mes actual'},
  ];

  readonly mesesFacturacionDisponibles: Array<{ valor: string; etiqueta: string }> = [
    {valor: 'TODOS', etiqueta: 'Todos los meses'},
    {valor: '01', etiqueta: 'Enero'},
    {valor: '02', etiqueta: 'Febrero'},
    {valor: '03', etiqueta: 'Marzo'},
    {valor: '04', etiqueta: 'Abril'},
    {valor: '05', etiqueta: 'Mayo'},
    {valor: '06', etiqueta: 'Junio'},
    {valor: '07', etiqueta: 'Julio'},
    {valor: '08', etiqueta: 'Agosto'},
    {valor: '09', etiqueta: 'Septiembre'},
    {valor: '10', etiqueta: 'Octubre'},
    {valor: '11', etiqueta: 'Noviembre'},
    {valor: '12', etiqueta: 'Diciembre'},
  ];

  constructor(
    private transaccionService: TransaccionService,
    private cuentaService: CuentaService,
    private categoriaService: CategoriaService,
    private filtroService: FiltroService,
    private router: Router,
  ) {
  }

  ngOnInit(): void {
    const filtrosGuardados = this.filtroService.obtenerFiltros();
    if (filtrosGuardados) {
      this.filtros = filtrosGuardados.filtros;
      this.modoBusqueda = filtrosGuardados.modoBusqueda;
    }
    this.cargarDatosIniciales();
  }

  private cargarDatosIniciales(): void {
    this.cargandoTransacciones = true;

    forkJoin({
      cuentas: this.cuentaService.obtenerCuentas().pipe(catchError(() => of([]))),
      categorias: this.categoriaService
        .obtenerCategorias()
        .pipe(catchError(() => of([]))),
      transacciones: this.transaccionService.obtenerTransacciones(0, this.registrosPorPagina, undefined, this.sortState ?? undefined),
    }).subscribe(({cuentas, categorias, transacciones}) => {
      this.cuentas = cuentas as Cuenta[];
      this.categorias = categorias as Categoria[];

      const paginaInicial = transacciones;
      this.transacciones = paginaInicial.transacciones;
      this.transaccionesFiltradas = paginaInicial.transacciones;
      this.transaccionesTotales = paginaInicial.transacciones;
      this.totalPaginasBackend = paginaInicial.paginacion.totalPages;
      this.paginasEnCache.set(0, paginaInicial.transacciones);
      this.actualizarDataSource();

      this.cargandoTransacciones = false;
    }, () => {
      this.cargandoTransacciones = false;
    });
  }

  private actualizarDataSource(): void {
    this.dataSource.data = this.transaccionesFiltradas;
  }

  aplicarFiltros(): void {
    this.filtrando = true;

    this.filtroService.guardarFiltros(this.filtros, this.modoBusqueda);

    // Reiniciar caché y paginación
    this.paginasEnCache.clear();
    this.paginaActual = 1;

    // Construir objeto de filtros para enviar al backend
    const filtrosParaBackend: Partial<FiltroTransacciones> = {
      modoBusqueda: this.modoBusqueda,
      modoFecha: this.filtros.modoFecha,
      periodo: this.filtros.periodo,
      fechaDesde: this.filtros.fechaDesde,
      fechaHasta: this.filtros.fechaHasta,
      mesFacturacion: this.filtros.mesFacturacion,
      tipo: this.filtros.tipo,
      cuentaId: this.filtros.cuentaId,
      categoriaId: this.filtros.categoriaId,
    };

    // Cargar primera página con filtros
    this.cargandoTransacciones = true;
    this.transaccionService.obtenerTransacciones(0, this.registrosPorPagina, filtrosParaBackend, this.sortState ?? undefined).subscribe({
      next: (respuesta) => {
        this.transacciones = respuesta.transacciones;
        this.totalPaginasBackend = respuesta.paginacion.totalPages;
        this.paginasEnCache.set(0, respuesta.transacciones);

        this.transaccionesFiltradas = this.transacciones;
        this.transaccionesTotales = this.transacciones;
        this.actualizarDataSource();
        this.cargandoTransacciones = false;
        this.filtrando = false;
      },
      error: () => {
        this.transacciones = [];
        this.transaccionesFiltradas = [];
        this.transaccionesTotales = [];
        this.actualizarDataSource();
        this.cargandoTransacciones = false;
        this.filtrando = false;
      },
    });
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina < 1 || nuevaPagina > this.totalPaginasBackend) {
      return;
    }

    // Convertir a índice de página (0 basado para el backend)
    const indicePagina = nuevaPagina - 1;

    // Si la página ya está en caché, usarla
    if (this.paginasEnCache.has(indicePagina)) {
      this.paginaActual = nuevaPagina;
      this.transaccionesFiltradas = (this.paginasEnCache.get(indicePagina) || []);
      this.actualizarDataSource();
      return;
    }

    // Si no está en caché, traerla del backend con los filtros actuales
    this.cargandoTransacciones = true;

    const filtrosParaBackend: Partial<FiltroTransacciones> = {
      modoBusqueda: this.modoBusqueda,
      modoFecha: this.filtros.modoFecha,
      periodo: this.filtros.periodo,
      fechaDesde: this.filtros.fechaDesde,
      fechaHasta: this.filtros.fechaHasta,
      mesFacturacion: this.filtros.mesFacturacion,
      tipo: this.filtros.tipo,
      cuentaId: this.filtros.cuentaId,
      categoriaId: this.filtros.categoriaId,
    };

    this.transaccionService.obtenerTransacciones(indicePagina, this.registrosPorPagina, filtrosParaBackend, this.sortState ?? undefined).subscribe({
      next: (respuesta) => {
        this.paginasEnCache.set(indicePagina, respuesta.transacciones);
        this.paginaActual = nuevaPagina;
        this.transaccionesFiltradas = respuesta.transacciones;
        this.totalPaginasBackend = respuesta.paginacion.totalPages;
        this.actualizarDataSource();
        this.cargandoTransacciones = false;
      },
      error: () => {
        this.cargandoTransacciones = false;
      },
    });
  }

  puedeIrAnterior(): boolean {
    return this.paginaActual > 1;
  }

  puedeIrSiguiente(): boolean {
    return this.paginaActual < this.totalPaginasBackend;
  }

  obtenerTotalPaginas(): number {
    return this.totalPaginasBackend;
  }

  obtenerPaginasVisibles(): (number | '...')[] {
    const total = this.totalPaginasBackend;
    const actual = this.paginaActual;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const primera = new Set<number>([1, 2]);
    const ultima = new Set<number>([total - 1, total]);
    const medio = new Set<number>();

    for (let i = actual - 1; i <= actual + 1; i++) {
      if (i >= 1 && i <= total) {
        medio.add(i);
      }
    }

    const todos = [...new Set([...primera, ...medio, ...ultima])].sort((a, b) => a - b);

    const resultado: (number | '...')[] = [];
    let previo = 0;

    for (const num of todos) {
      if (num - previo > 1) {
        resultado.push('...');
      }
      resultado.push(num);
      previo = num;
    }

    return resultado;
  }

  cambiarRegistrosPorPagina(): void {
    this.paginaActual = 1;
    this.paginasEnCache.clear();
    this.aplicarFiltros();
  }

  aplicarBusqueda(): void {
    if (!this.terminoBusqueda.trim()) {
      this.transaccionesTotales = this.transaccionesFiltradas;
    } else {
      const termino = this.terminoBusqueda.toLowerCase().trim();
      this.transaccionesTotales = this.transaccionesFiltradas.filter((transaccion) => {
        const monto = transaccion.monto.toString();
        const tipo = transaccion.tipo.toLowerCase();
        const fecha = new Date(transaccion.fecha).toLocaleDateString('es-ES');
        const cuenta = this.obtenerNombreCuenta(transaccion).toLowerCase();
        const categoria = this.obtenerNombreCategoria(transaccion).toLowerCase();
        const mes = this.obtenerMesPeriodoFacturacion(transaccion).toLowerCase();
        const cuotas = this.obtenerTextoCuotas(transaccion);

        return (
          monto.includes(termino) ||
          tipo.includes(termino) ||
          fecha.includes(termino) ||
          cuenta.includes(termino) ||
          categoria.includes(termino) ||
          mes.includes(termino) ||
          cuotas.includes(termino)
        );
      });
    }
  }

  onModoFechaChange(): void {
    if (this.filtros.modoFecha === 'PREDEFINIDO') {
      this.filtros.fechaDesde = null;
      this.filtros.fechaHasta = null;
    }

    setTimeout(() => this.aplicarFiltros(), 0);
  }

  onModoBusquedaChange(): void {
    if (this.modoBusqueda === 'PERIODO_FACTURACION') {
      this.filtros.modoFecha = 'PREDEFINIDO';
      this.filtros.fechaDesde = null;
      this.filtros.fechaHasta = null;
    }

    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.filtroService.limpiarFiltros();
    this.modoBusqueda = 'PERIODO_FACTURACION';
    this.paginaActual = 1;
    this.terminoBusqueda = '';
    this.filtros = {
      modoBusqueda: 'PERIODO_FACTURACION',
      modoFecha: 'PREDEFINIDO',
      periodo: 'MES_ACTUAL',
      fechaDesde: null,
      fechaHasta: null,
      mesFacturacion: 'TODOS',
      tipo: 'TODOS',
      cuentaId: null,
      categoriaId: null,
    };

    this.aplicarFiltros();
  }

  obtenerNombreCuenta(transaccion: Transaccion): string {
    if (transaccion.cuentaNombre) {
      return transaccion.cuentaNombre;
    }

    const cuenta = this.cuentas.find((item) => item.id === transaccion.cuentaId);
    return cuenta?.nombre ?? 'Sin cuenta';
  }

  obtenerNombreCategoria(transaccion: Transaccion): string {
    if (transaccion.categoriaNombre) {
      return transaccion.categoriaNombre;
    }

    const categoria = this.categorias.find((item) => item.id === transaccion.categoriaId);
    return categoria?.nombre ?? 'Sin categoria';
  }

  obtenerTextoPeriodo(periodo: PeriodoFiltro): string {
    if (periodo === 'HOY') return 'Hoy';
    if (periodo === 'ULTIMOS_7_DIAS') return 'Ultimos 7 dias';
    if (periodo === 'ULTIMOS_30_DIAS') return 'Ultimos 30 dias';
    return 'Mes actual';
  }

  obtenerMesPeriodoFacturacion(transaccion: Transaccion): string {
    if (transaccion.periodoFacturacion) {
      const [anioTexto, mesTexto] = transaccion.periodoFacturacion.split('-');
      const anio = Number(anioTexto);
      const mes = Number(mesTexto);

      if (!Number.isNaN(anio) && !Number.isNaN(mes) && mes >= 1 && mes <= 12) {
        return this.formatearNombreMes(mes - 1);
      }
    }

    return this.formatearNombreMes(this.normalizarFecha(transaccion.fecha).getMonth());
  }

  obtenerTextoCuotas(transaccion: Transaccion): string {
    const cuotaActual = transaccion.cuotaActual;
    const totalCuotas = transaccion.totalCuotas;

    if (cuotaActual == null && totalCuotas == null) {
      return '1/1';
    }

    return `${cuotaActual ?? 1}/${totalCuotas ?? 1}`;
  }

  editarTransaccion(transaccion: Transaccion): void {
    this.router.navigate(['/transaccion', transaccion.id], {
      state: {transaccion},
    });
  }

  eliminarTransaccion(transaccion: Transaccion): void {
    const confirmado = window.confirm(`¿Eliminar la transacción #${transaccion.id}?`);
    if (!confirmado) {
      return;
    }

    this.cargandoTransacciones = true;
    this.error = '';

    this.transaccionService.eliminarTransaccion(transaccion.id).subscribe({
      next: () => {
        this.transacciones = this.transacciones.filter((item) => item.id !== transaccion.id);
        this.aplicarFiltros();
        this.cargandoTransacciones = false;
      },
      error: (error: any) => {
        this.error = error?.error?.message ?? 'No se pudo eliminar la transacción.';
        this.cargandoTransacciones = false;
      },
    });
  }

  mostrarFiltroMesFacturacion(): boolean {
    return this.modoBusqueda === 'PERIODO_FACTURACION';
  }

  private normalizarFecha(fecha: string | Date): Date {
    let date: Date;

    if (typeof fecha === 'string') {
      date = fecha.includes('T') ? new Date(fecha) : new Date(`${fecha}T00:00:00`);
    } else {
      date = new Date(fecha);
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatearNombreMes(indiceMes: number): string {
    const nombreMes = new Intl.DateTimeFormat('es-ES', {month: 'long'}).format(new Date(2026, indiceMes, 1));
    return nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  }
}
