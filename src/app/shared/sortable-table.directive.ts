import {AfterViewInit, Directive, ElementRef} from '@angular/core';

type Direccion = 'asc' | 'desc';
type TipoValor = 'texto' | 'numero' | 'fecha';

interface Cabecera {
  celda: HTMLTableCellElement;
  indice: number;
  tipo: TipoValor;
}

/**
 * Ordena las filas de una tabla al hacer clic en sus cabeceras, alternando
 * ascendente/descendente. Las celdas vacias o no parseables van siempre al
 * final. No toca el arreglo del componente: reordena el DOM del <tbody>, que
 * en la practica persiste hasta que Angular vuelve a renderizar los datos.
 *
 * Uso: `<table appTablaOrdenable>` y en cada `<th>`:
 *   - `data-sort-type="numero|fecha"` para ordenar numericamente/por fecha
 *     (por defecto ordena como texto).
 *   - `data-sortable="false"` para excluir la columna (p. ej. Acciones).
 *   - `data-sort-value` en una celda para sobreescribir el texto visible.
 */
@Directive({
  selector: 'table[appTablaOrdenable]',
  standalone: true,
})
export class TablaOrdenableDirective implements AfterViewInit {
  private tabla!: HTMLTableElement;
  private cabeceras: Cabecera[] = [];
  private orden: {cabecera: Cabecera; direccion: Direccion} | null = null;

  constructor(private elementRef: ElementRef<HTMLTableElement>) {}

  ngAfterViewInit(): void {
    this.tabla = this.elementRef.nativeElement;
    this.registrarCabeceras();
  }

  private registrarCabeceras(): void {
    const filaCabecera = this.tabla.querySelector('thead tr');
    const celdas = filaCabecera
      ? (Array.from(filaCabecera.children) as HTMLTableCellElement[])
      : [];

    celdas.forEach((celda, indice) => {
      if (celda.dataset['sortable'] === 'false') {
        return;
      }

      const cabecera: Cabecera = {
        celda,
        indice,
        tipo: this.tipoDe(celda),
      };
      this.cabeceras.push(cabecera);
      celda.classList.add('ordenable');
      celda.addEventListener('click', () => this.alternar(cabecera));
    });
  }

  private alternar(cabecera: Cabecera): void {
    if (!this.orden || this.orden.cabecera !== cabecera) {
      this.orden = {cabecera, direccion: 'asc'};
    } else {
      this.orden.direccion = this.orden.direccion === 'asc' ? 'desc' : 'asc';
    }

    this.aplicar();
  }

  private aplicar(): void {
    const cuerpo = this.tabla.querySelector('tbody');
    if (!cuerpo || !this.orden) {
      return;
    }

    const {cabecera, direccion} = this.orden;
    const filas = (Array.from(cuerpo.children) as HTMLTableRowElement[]).sort(
      (a, b) => this.comparar(a, b, cabecera, direccion),
    );

    // `appendChild` reubica cada fila manteniendo el árbol: en una sola pasada
    // queda el orden deseado sin recrear nodos.
    for (const fila of filas) {
      cuerpo.appendChild(fila);
    }

    this.actualizarIndicadores();
  }

  private comparar(
    a: HTMLTableRowElement,
    b: HTMLTableRowElement,
    cabecera: Cabecera,
    direccion: Direccion,
  ): number {
    const va = this.valorCelda(a.cells[cabecera.indice], cabecera.tipo);
    const vb = this.valorCelda(b.cells[cabecera.indice], cabecera.tipo);

    if (va === null && vb === null) {
      return 0;
    }
    if (va === null) {
      return 1;
    }
    if (vb === null) {
      return -1;
    }

    const resultado =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'es', {numeric: true, sensitivity: 'base'});

    return direccion === 'asc' ? resultado : -resultado;
  }

  private valorCelda(celda: HTMLTableCellElement | undefined, tipo: TipoValor): number | string | null {
    if (!celda) {
      return null;
    }

    const texto = (celda.dataset['sortValue'] ?? celda.textContent ?? '').trim();

    if (tipo === 'numero') {
      return parsearNumero(texto);
    }
    if (tipo === 'fecha') {
      return parsearFecha(texto);
    }
    return texto;
  }

  private actualizarIndicadores(): void {
    for (const cabecera of this.cabeceras) {
      const activa = this.orden?.cabecera === cabecera;
      cabecera.celda.classList.toggle('orden-asc', activa && this.orden?.direccion === 'asc');
      cabecera.celda.classList.toggle('orden-desc', activa && this.orden?.direccion === 'desc');
    }
  }

  private tipoDe(celda: HTMLTableCellElement): TipoValor {
    const tipo = celda.dataset['sortType'];
    return tipo === 'numero' || tipo === 'fecha' ? tipo : 'texto';
  }
}

/** Números en formato es-CL ("50.000" o "9.573,5") ademas de los planos. */
function parsearNumero(texto: string): number | null {
  const limpio = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const numero = Number(limpio);

  return Number.isFinite(numero) ? numero : null;
}

/** Fechas "dd/MM/yyyy", "dd-mm-yyyy" o "yyyy-MM-dd". */
function parsearFecha(texto: string): number | null {
  const partes = texto.split(/[-/]/);
  if (partes.length !== 3) {
    return null;
  }

  let dia: number;
  let mes: number;
  let anio: number;

  if (partes[0].length === 4) {
    anio = Number(partes[0]);
    mes = Number(partes[1]);
    dia = Number(partes[2]);
  } else {
    dia = Number(partes[0]);
    mes = Number(partes[1]);
    anio = Number(partes[2]);
  }

  if (!Number.isFinite(dia) || !Number.isFinite(mes) || !Number.isFinite(anio)) {
    return null;
  }

  return Date.UTC(anio, mes - 1, dia);
}