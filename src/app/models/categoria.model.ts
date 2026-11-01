export interface Categoria {
  id: number;
  nombre: string;
  tipo: string;
  icono?: string;
  color?: string;
  parentId?: number | null;
  codigoSistema?: string | null;
}

export interface CategoriaRequest {
  nombre: string;
  tipo: string;
  parentId?: number | null;
  icono?: string | null;
  color?: string | null;
}
