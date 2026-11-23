import { Directive, ElementRef, HostListener, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Separadores de miles y decimales del idioma y región del navegador (es-CL: "1.234,5"; en-US: "1,234.5"). */
export function separadoresDelNavegador(locale = navigator.languages?.[0] ?? navigator.language): {
  miles: string;
  decimal: string;
} {
  const partes = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    miles: partes.find((p) => p.type === 'group')?.value ?? '.',
    decimal: partes.find((p) => p.type === 'decimal')?.value ?? ',',
  };
}

/**
 * Input de monto con separador de miles mientras se escribe. El control (reactivo o ngModel)
 * recibe un number, o null si está vacío; el texto visible usa los separadores del navegador.
 * Uso: <input appMonto formControlName="monto"> o <input appMonto [(ngModel)]="monto">.
 */
@Directive({
  selector: 'input[appMonto]',
  standalone: true,
  host: { type: 'text', inputmode: 'decimal', autocomplete: 'off' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MontoInputDirective), multi: true }],
})
export class MontoInputDirective implements ControlValueAccessor {
  /** Máximo de decimales permitidos; 0 para solo enteros. */
  @Input() montoDecimales = 2;

  private readonly separadores = separadoresDelNavegador();
  private onChange: (valor: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly elemento: ElementRef<HTMLInputElement>) {}

  writeValue(valor: number | string | null): void {
    const numero = valor === null || valor === undefined || valor === '' ? null : Number(valor);
    this.elemento.nativeElement.value =
      numero === null || !Number.isFinite(numero) ? '' : this.formatearNumero(numero);
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.elemento.nativeElement.disabled = deshabilitado;
  }

  @HostListener('input')
  alEscribir(): void {
    const input = this.elemento.nativeElement;
    const texto = input.value;
    const cursor = input.selectionStart ?? texto.length;
    // Cuántos dígitos quedaban antes del cursor, para devolverlo al mismo lugar tras reformatear.
    const digitosAntes = texto.slice(0, cursor).replace(/\D/g, '').length;

    const { visible, valor } = this.normalizar(texto);
    input.value = visible;
    this.onChange(valor);

    let posicion = cursor >= texto.length ? visible.length : 0;
    for (let vistos = 0; cursor < texto.length && posicion < visible.length && vistos < digitosAntes; posicion++) {
      if (/\d/.test(visible[posicion])) vistos++;
    }
    if (document.activeElement === input) input.setSelectionRange(posicion, posicion);
  }

  @HostListener('blur')
  alSalir(): void {
    const input = this.elemento.nativeElement;
    // Quita un separador decimal colgando ("1.000," → "1.000").
    const { valor } = this.normalizar(input.value);
    input.value = valor === null ? '' : this.formatearNumero(valor);
    this.onTouched();
  }

  /** Interpreta el texto con los separadores del navegador y lo reformatea. */
  private normalizar(texto: string): { visible: string; valor: number | null } {
    const { decimal } = this.separadores;
    const negativo = texto.trim().startsWith('-');
    const indiceDecimal = this.montoDecimales > 0 ? texto.lastIndexOf(decimal) : -1;
    const parteEntera = (indiceDecimal >= 0 ? texto.slice(0, indiceDecimal) : texto).replace(/\D/g, '');
    const parteDecimal =
      indiceDecimal >= 0 ? texto.slice(indiceDecimal + 1).replace(/\D/g, '').slice(0, this.montoDecimales) : null;

    if (!parteEntera && !parteDecimal) {
      return { visible: negativo ? '-' : parteDecimal === '' ? `0${decimal}` : '', valor: null };
    }

    const entero = parteEntera.replace(/^0+(?=\d)/, '') || '0';
    const visibleEntero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, this.separadores.miles);
    const visible =
      (negativo ? '-' : '') + visibleEntero + (parteDecimal !== null ? decimal + parteDecimal : '');
    const valor = Number(`${negativo ? '-' : ''}${entero}${parteDecimal ? '.' + parteDecimal : ''}`);
    return { visible, valor };
  }

  private formatearNumero(numero: number): string {
    const [entero, decimales] = Math.abs(numero).toFixed(this.montoDecimales).split('.');
    const decimalesUtiles = (decimales ?? '').replace(/0+$/, '');
    return (
      (numero < 0 ? '-' : '') +
      entero.replace(/\B(?=(\d{3})+(?!\d))/g, this.separadores.miles) +
      (decimalesUtiles ? this.separadores.decimal + decimalesUtiles : '')
    );
  }
}
