import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MontoInputDirective, separadoresDelNavegador } from './monto-input.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MontoInputDirective],
  template: `<input appMonto [formControl]="control" /><input appMonto [montoDecimales]="0" [formControl]="entero" />`,
})
class HostComponent {
  control = new FormControl<number | null>(null);
  entero = new FormControl<number | null>(null);
}

describe('MontoInputDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let input: HTMLInputElement;
  let inputEntero: HTMLInputElement;
  const { miles, decimal } = separadoresDelNavegador();

  const escribir = (elemento: HTMLInputElement, texto: string) => {
    elemento.value = texto;
    elemento.dispatchEvent(new Event('input'));
  };

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    [input, inputEntero] = Array.from(fixture.nativeElement.querySelectorAll('input'));
  });

  it('detecta los separadores según el idioma y región', () => {
    expect(separadoresDelNavegador('es-CL')).toEqual({ miles: '.', decimal: ',' });
    expect(separadoresDelNavegador('en-US')).toEqual({ miles: ',', decimal: '.' });
  });

  it('agrega el separador de miles al escribir y entrega un número al formulario', () => {
    escribir(input, '1234567');
    expect(input.value).toBe(`1${miles}234${miles}567`);
    expect(host.control.value).toBe(1234567);
  });

  it('acepta decimales con el separador del idioma', () => {
    escribir(input, `1${miles}500${decimal}25`);
    expect(input.value).toBe(`1${miles}500${decimal}25`);
    expect(host.control.value).toBe(1500.25);
  });

  it('formatea el valor que viene del formulario', () => {
    host.control.setValue(500000);
    expect(input.value).toBe(`500${miles}000`);
  });

  it('entrega null si se vacía', () => {
    escribir(input, '');
    expect(host.control.value).toBeNull();
  });

  it('ignora decimales cuando el campo es entero', () => {
    escribir(inputEntero, `48000${decimal}5`);
    expect(host.entero.value).toBe(480005);
    expect(inputEntero.type).toBe('text');
  });
});
