import { Transaccion } from './transaccion.model';

export interface CuadreAgrupado {
  id: number | null;
  nombre: string;
  total: number;
  cantidad: number;
}

export interface CuadreGastos {
  cuentaId: number;
  cuentaNombre: string;
  periodo: string;
  total: number;
  cantidadTransacciones: number;
  cantidadComprasEnCuotas: number;
  totalComprasEnCuotas: number;
  incluyeCuotaCero: boolean;
  porCategoria: CuadreAgrupado[];
  porComercio: CuadreAgrupado[];
  transacciones: Transaccion[];
}
