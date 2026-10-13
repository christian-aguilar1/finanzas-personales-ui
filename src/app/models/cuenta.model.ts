export interface Cuenta {
  id: number;
  nombre: string;
  tipo: string;
  /** Ancla editable de la cuenta: las transacciones nunca la modifican. */
  saldoInicial?: number;
  /** Derivado, solo lectura: nunca se envía al backend (no va en `CuentaRequest`). */
  saldoActual?: number;
}

export interface CuentaRequest {
  nombre: string;
  moneda: string;
  tipo: string;
  saldoInicial: number;
}