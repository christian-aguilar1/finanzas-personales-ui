import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of, throwError} from 'rxjs';
import {RecurrentesComponent} from './recurrentes';
import {TransaccionService} from '../../services/transaccion.service';

describe('Recurrentes', () => {
  const datos = [{id: 1, fecha: '2026-10-01', monto: 80000, tipo: 'EGRESO', nombreRecurrente: 'Gasto común', frecuenciaRecurrencia: 'TRIMESTRAL'},
    {id: 2, fecha: '2026-10-01', monto: 1000000, tipo: 'INGRESO', nombreRecurrente: 'Sueldo'}];
  let servicio: {obtenerRecurrentes: jasmine.Spy};
  beforeEach(() => {
    servicio = {obtenerRecurrentes: jasmine.createSpy().and.returnValue(of(datos))};
    TestBed.configureTestingModule({imports: [RecurrentesComponent], providers: [provideRouter([]), {provide: TransaccionService, useValue: servicio}]});
  });
  it('carga recurrentes y filtra por nombre, tipo y frecuencia', () => {
    const fixture = TestBed.createComponent(RecurrentesComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.visibles.length).toBe(2);
    c.busqueda = 'COMUN'; c.tipo = 'EGRESO'; c.frecuencia = 'TRIMESTRAL';
    expect(c.visibles.map(t => t.id)).toEqual([1]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Trimestral');
    expect(fixture.nativeElement.querySelector('tbody a').getAttribute('href')).toContain('/transaccion/1');
  });
  it('muestra el estado vacío', () => {
    servicio.obtenerRecurrentes.and.returnValue(of([]));
    const fixture = TestBed.createComponent(RecurrentesComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aún no tienes recurrentes');
  });
  it('permite reintentar después de un error', () => {
    servicio.obtenerRecurrentes.and.returnValue(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(RecurrentesComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    servicio.obtenerRecurrentes.and.returnValue(of(datos));
    fixture.componentInstance.cargar(); fixture.detectChanges();
    expect(fixture.componentInstance.visibles.length).toBe(2);
  });
});
