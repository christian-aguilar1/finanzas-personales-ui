import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { AsistenteChatComponent } from './asistente-chat';
import { AsistenteService } from '../../services/asistente.service';
import { CambiosFinancierosService } from '../../services/cambios-financieros.service';
import { CambiosNotasService } from '../../services/cambios-notas.service';
import { ConexionService } from '../../services/conexion.service';
import { ConfirmacionAsistente, PropuestaAsistente } from '../../models/asistente.model';

describe('AsistenteChatComponent', () => {
  let fixture: ComponentFixture<AsistenteChatComponent>;
  let component: AsistenteChatComponent;
  let service: jasmine.SpyObj<AsistenteService>;
  const sinConexion = signal(false);
  const propuesta: PropuestaAsistente = {
    id: 'propuesta-1', expiraEn: '2099-01-01T12:00:00Z', cuentaNombre: 'Cuenta corriente', categoriaNombre: 'Bencina',
    transaccion: {
      cuentaId: 1, tipo: 'EGRESO', fecha: '2026-11-01', monto: 15000,
      medio: 'DEBITO', categoriaId: 2, subcategoriaId: null, periodoFacturacion: null,
      comercioId: null, descripcion: 'Bencina', esRecurrente: false,
      totalCuotas: null, cuotaActual: null, tagIds: [],
    },
  };

  beforeEach(async () => {
    sinConexion.set(false);
    service = jasmine.createSpyObj<AsistenteService>('AsistenteService', ['obtenerEstado', 'conversar', 'confirmar']);
    service.obtenerEstado.and.returnValue(of({ disponible: true, mensaje: 'Disponible' }));
    service.conversar.and.returnValue(of({ respuesta: 'Revisa la propuesta', propuestas: [propuesta] }));
    await TestBed.configureTestingModule({
      imports: [AsistenteChatComponent],
      providers: [
        provideRouter([]), provideNoopAnimations(),
        { provide: AsistenteService, useValue: service },
        { provide: ConexionService, useValue: { sinConexion } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AsistenteChatComponent);
    component = fixture.componentInstance;
    component.abrir();
    fixture.detectChanges();
  });

  const preparar = () => {
    component.texto = 'Gasté 15 lucas en bencina';
    component.enviar();
    fixture.detectChanges();
    return component.mensajes()[1].propuestas![0];
  };

  it('prepara una tarjeta y no guarda hasta confirmar explícitamente', () => {
    preparar();
    expect(service.confirmar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Confirmar y guardar');
    expect(fixture.nativeElement.textContent).toContain('Cuenta corriente');
  });

  it('actualiza las notas al recibir una confirmación persistida del bot', () => {
    const notificar = spyOn(TestBed.inject(CambiosNotasService), 'notificar');
    service.conversar.and.returnValue(of({ respuesta: 'Nota guardada.', propuestas: [],
      notaGuardada: { id: 9, texto: 'Pagar luz', fechaLimite: '2026-11-05', resuelta: false, diasRestantes: 2 } }));
    component.texto = 'Recuérdame pagar luz el 5 de noviembre';
    component.enviar();
    expect(notificar).toHaveBeenCalledTimes(1);
    expect(service.conversar.calls.mostRecent().args[2]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('bloquea dobles clics y avisa a las vistas solo después de guardar', () => {
    const tarjeta = preparar();
    const pendiente = new Subject<ConfirmacionAsistente>();
    service.confirmar.and.returnValue(pendiente);
    const notificar = spyOn(TestBed.inject(CambiosFinancierosService), 'notificar');
    component.confirmar(tarjeta);
    component.confirmar(tarjeta);
    expect(service.confirmar).toHaveBeenCalledTimes(1);
    expect(notificar).not.toHaveBeenCalled();
    pendiente.next({ transaccionId: 77, yaConfirmada: false });
    expect(tarjeta.estado).toBe('guardada');
    expect(notificar).toHaveBeenCalledTimes(1);
    component.confirmar(tarjeta);
    expect(service.confirmar).toHaveBeenCalledTimes(1);
  });

  it('un fallo de red permite reintentar la misma propuesta sin crear otra', () => {
    const tarjeta = preparar();
    service.confirmar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.confirmar(tarjeta);
    expect(tarjeta.estado).toBe('pendiente');
    expect(tarjeta.error).toContain('conexión');
    expect(service.conversar).toHaveBeenCalledTimes(1);
  });

  it('descartar y vencer una propuesta no escribe transacciones', () => {
    const tarjeta = preparar();
    component.descartar(tarjeta);
    component.confirmar(tarjeta);
    expect(service.confirmar).not.toHaveBeenCalled();
    tarjeta.estado = 'pendiente';
    tarjeta.expiraEn = '2000-01-01T00:00:00Z';
    component.confirmar(tarjeta);
    expect(tarjeta.estado).toBe('vencida');
    expect(service.confirmar).not.toHaveBeenCalled();
  });

  it('conserva el texto cuando la consulta falla y no duplica el historial al reintentar', () => {
    service.conversar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 502 })));
    component.texto = '¿Cuánto gasté?';
    component.enviar();
    expect(component.texto).toBe('¿Cuánto gasté?');
    expect(component.mensajes()).toEqual([]);
    expect(component.enviando()).toBeFalse();
  });

  it('muestra falta de configuración y bloquea consultas sin conexión', () => {
    service.obtenerEstado.and.returnValue(of({ disponible: false, mensaje: 'Falta configurar el proveedor' }));
    component.cargarEstado();
    component.texto = 'Hola';
    component.enviar();
    expect(service.conversar).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Falta configurar el proveedor');
    component.estado.set({ disponible: true, mensaje: '' });
    sinConexion.set(true);
    component.enviar();
    expect(service.conversar).not.toHaveBeenCalled();
  });

  it('presenta las respuestas de IA como texto, sin ejecutar HTML', () => {
    service.conversar.and.returnValue(of({ respuesta: '<img src=x onerror=alert(1)>', propuestas: [] }));
    component.texto = 'Hola';
    component.enviar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
