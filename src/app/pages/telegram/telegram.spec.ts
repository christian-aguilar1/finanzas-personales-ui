import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { TelegramComponent } from './telegram';
import { TelegramService } from '../../services/telegram.service';
import { ConexionService } from '../../services/conexion.service';
import { EnlaceTelegram, EstadoTelegram } from '../../models/telegram.model';

describe('TelegramComponent', () => {
  let fixture: ComponentFixture<TelegramComponent>;
  let component: TelegramComponent;
  let service: jasmine.SpyObj<TelegramService>;
  const sinConexion = signal(false);
  const disponible: EstadoTelegram = {
    disponible: true, vinculado: false, botUsername: 'finanzas_bot',
    telegramUsername: null, vinculadoEn: null, asistenteDisponible: true,
  };
  const enlace: EnlaceTelegram = { url: 'https://t.me/finanzas_bot?start=un-codigo', expiraEn: '2099-01-01T12:00:00Z' };

  beforeEach(async () => {
    sinConexion.set(false);
    service = jasmine.createSpyObj<TelegramService>('TelegramService', ['obtenerEstado', 'crearEnlace', 'desvincular']);
    service.obtenerEstado.and.returnValue(of(disponible));
    service.crearEnlace.and.returnValue(of(enlace));
    service.desvincular.and.returnValue(of(void 0));
    await TestBed.configureTestingModule({
      imports: [TelegramComponent], providers: [provideRouter([]),
        { provide: TelegramService, useValue: service },
        { provide: ConexionService, useValue: { sinConexion } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TelegramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra el enlace solo después de generarlo y explica que debe pulsar Iniciar', () => {
    expect(fixture.nativeElement.querySelector('.enlace-listo')).toBeNull();
    component.conectar();
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.enlace-listo a') as HTMLAnchorElement;
    expect(link.href).toBe(enlace.url);
    expect(link.rel).toContain('noreferrer');
    expect(fixture.nativeElement.textContent).toContain('Iniciar');
    expect(fixture.nativeElement.textContent).not.toContain('un-codigo');
  });

  it('bloquea dobles clics mientras se genera el enlace', () => {
    const pendiente = new Subject<EnlaceTelegram>();
    service.crearEnlace.and.returnValue(pendiente);
    component.conectar();
    component.conectar();
    expect(service.crearEnlace).toHaveBeenCalledTimes(1);
    pendiente.next(enlace);
    expect(component.guardando()).toBeFalse();
  });

  it('detecta el vínculo, quita el enlace temporal y permite desconectar', () => {
    component.conectar();
    service.obtenerEstado.and.returnValue(of({ ...disponible, vinculado: true, telegramUsername: 'persona' }));
    component.alVolver();
    fixture.detectChanges();
    expect(component.enlace()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('@persona');
    component.desconectar();
    expect(component.estado()?.vinculado).toBeFalse();
    expect(component.aviso()).toContain('ya no tiene acceso');
  });

  it('cancelar la vinculación invalida el código en el servidor', () => {
    component.conectar();
    component.desconectar();
    expect(service.desvincular).toHaveBeenCalledTimes(1);
    expect(component.enlace()).toBeNull();
  });

  it('un error al desconectar conserva el vínculo y muestra el error', () => {
    component.estado.set({ ...disponible, vinculado: true });
    service.desvincular.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    component.desconectar();
    expect(component.estado()?.vinculado).toBeTrue();
    expect(component.error()).toBeTruthy();
    expect(component.guardando()).toBeFalse();
  });

  it('no ofrece conectar cuando no está habilitado o no hay red', () => {
    component.estado.set({ ...disponible, disponible: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('todavía no está habilitado');
    component.conectar();
    expect(service.crearEnlace).not.toHaveBeenCalled();
    component.estado.set(disponible);
    sinConexion.set(true);
    component.conectar();
    expect(service.crearEnlace).not.toHaveBeenCalled();
  });
});
