export interface Comercio {
  id: number;
  nombre: string;
  rubro: string | null;
}
export interface ComercioRequest {
  nombre: string;
  rubro: string | null;
}
