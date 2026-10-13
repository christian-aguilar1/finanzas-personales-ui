export type TipoTransaccion = 'INGRESO' | 'EGRESO';
export type ModoBusquedaTransacciones = 'PERIODO_FACTURACION' | 'FECHA_TRANSACCION';
export type ModoFechaFiltro = 'PREDEFINIDO' | 'RANGO';

export interface Transaccion {
  id: number;
  fecha: string;
  periodoFacturacion?: string;
  monto: number;
  tipo: TipoTransaccion;
  esRecurrente?: boolean;
  cuotaActual?: number | null;
  totalCuotas?: number | null;
  descripcion?: string;
  cuentaId?: number;
  cuentaNombre?: string;
  categoriaId?: number;
  categoriaNombre?: string;
  categoriaEsHija?: boolean | null;
  categoriaPadreId?: number | null;
  categoriaPadreNombre?: string;
}

export interface TransaccionRequest {
  cuentaId: number;
  tipo: TipoTransaccion;
  fecha: string;
  periodoFacturacion: string | null;
  monto: number;
  categoriaId: number | null;
  subcategoriaId: number | null;
  medio: string;
  comercioId: number | null;
  descripcion: string;
  esRecurrente: boolean;
  totalCuotas: number | null;
  cuotaActual: number | null;
  tagIds: number[];
}

export type CrearTransaccionRequest = TransaccionRequest;

export type PeriodoFiltro = 'HOY' | 'ULTIMOS_7_DIAS' | 'ULTIMOS_30_DIAS' | 'MES_ACTUAL';

export interface FiltroTransacciones {
  modoBusqueda: ModoBusquedaTransacciones;
  modoFecha: ModoFechaFiltro;
  periodo: PeriodoFiltro;
  fechaDesde: string | null;
  fechaHasta: string | null;
  mesFacturacion: string | null;
  tipo: 'TODOS' | TipoTransaccion;
  cuentaId: number | null;
  categoriaId: number | null;
}

export interface ProyeccionCategoria {
  categoriaPadreId: number | null;
  categoriaNombre: string;
  total: number;
  cantidad: number;
}

export interface ProyeccionTransaccion {
  descripcion?: string | null;
  cuenta?: string | null;
  categoria: string;
  cuota?: string | null;
  fecha: string;
  monto: number;
  tipo: TipoTransaccion;
  /** true si ya está registrada en el periodo en curso; false si está proyectada. */
  esRealizada: boolean;
}

export interface Proyeccion {
  periodo: string;
  ingresoTotal: number;
  egresoTotal: number;
  total: number;
  ingresosPorCategoria: ProyeccionCategoria[];
  egresosPorCategoria: ProyeccionCategoria[];
  transacciones: ProyeccionTransaccion[];
}

export interface PaginaTransacciones {
  _embedded: {
    transaccionResponseList: Transaccion[];
  };
  _links: {
    first?: { href: string };
    self: { href: string };
    next?: { href: string };
    last?: { href: string };
  };
  /**
   * Saldo con el que abre el periodo consultado (arrastre acumulado). Lo
   * calcula el backend; si no viene, la vista no lo inventa.
   */
  saldoInicio?: number;
  /** Alias del mismo concepto que usa el backend en algunas respuestas. */
  arrastre?: number;
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export {};

