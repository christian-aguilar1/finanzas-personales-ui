export interface Nota {
  id: number;
  texto: string;
  fechaLimite: string | null;
  resuelta: boolean;
  diasRestantes: number | null;
}

export interface NotaRequest {
  texto: string;
  fechaLimite: string | null;
  resuelta: boolean;
}

export function fechaNota(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(anio, mes - 1, dia));
}

export function plazoNota(dias: number | null): string {
  if (dias == null) return 'Sin fecha límite';
  if (dias === 0) return 'Vence hoy';
  if (dias < 0) return `Venció hace ${-dias} ${dias === -1 ? 'día' : 'días'}`;
  return `Quedan ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
