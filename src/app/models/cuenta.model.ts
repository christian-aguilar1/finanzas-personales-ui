export interface Cuenta {
  id: number;
  nombre: string;
  tipo: string;
  saldoInicial?: number;
}

export interface CuentaRequest {
  nombre: string;
  moneda: string;
  tipo: string;
  saldoInicial: number;
}

