import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { PreferenciasTelegramComponent } from './preferencias-telegram';
import { TelegramService } from '../../services/telegram.service';
import { CuentaService } from '../../services/cuenta.service';
import { CategoriaService } from '../../services/categoria.service';
import { ConexionService } from '../../services/conexion.service';
import { PreferenciasTelegram } from '../../models/telegram.model';

describe('PreferenciasTelegramComponent', () => {
  let fixture: ComponentFixture<PreferenciasTelegramComponent>;
  let component: PreferenciasTelegramComponent;
  let telegram: jasmine.SpyObj<TelegramService>;
  const sinConexion = signal(false);

  beforeEach(async () => {
    sinConexion.set(false);
    telegram = jasmine.createSpyObj<TelegramService>('TelegramService', ['obtenerPreferencias', 'guardarPreferencias']);
    telegram.obtenerPreferencias.and.returnValue(of({ cuentaId: 2, categoriaId: 11 }));
    telegram.guardarPreferencias.and.callFake((p) => of(p));
    await TestBed.configureTestingModule({ imports: [PreferenciasTelegramComponent], providers: [
      { provide: TelegramService, useValue: telegram },
      { provide: CuentaService, useValue: { obtenerCuentas: () => of([{ id: 2, nombre: 'Cuenta principal', tipo: 'DEBITO' }]) } },
      { provide: CategoriaService, useValue: { obtenerCategorias: () => of([
        { id: 10, nombre: 'Mercadería', tipo: 'EGRESO', parentId: null },
        { id: 11, nombre: 'Negocio', tipo: 'EGRESO', parentId: 10 },
        { id: 20, nombre: 'Sueldo', tipo: 'INGRESO', parentId: null },
        { id: 30, nombre: 'Préstamo', tipo: 'EGRESO', codigoSistema: 'PRESTAMO_EGRESO' },
      ]) } },
      { provide: ConexionService, useValue: { sinConexion } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(PreferenciasTelegramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra valores guardados, subcategorías con su padre y el período automático', () => {
    expect(component.form.getRawValue()).toEqual({ cuentaId: 2, categoriaId: 11 });
    expect(component.form.pristine).toBeTrue();
    const opciones = fixture.nativeElement.querySelector('#telegram-categoria-default').textContent;
    expect(opciones).toContain('Mercadería › Negocio');
    expect(opciones).not.toContain('Sueldo');
    expect(opciones).not.toContain('Préstamo');
    expect(fixture.nativeElement.textContent).toContain('Mes actual');
  });

  it('guarda los ids elegidos sin usuario ni datos financieros nuevos', () => {
    component.form.setValue({ cuentaId: 2, categoriaId: 10 });
    component.form.markAsDirty();
    component.guardar();
    expect(telegram.guardarPreferencias).toHaveBeenCalledWith({ cuentaId: 2, categoriaId: 10 });
    expect(component.aviso()).toContain('Preferencias guardadas');
    expect(component.form.pristine).toBeTrue();
  });

  it('permite quitar los predeterminados y evita dobles envíos', () => {
    const pendiente = new Subject<PreferenciasTelegram>();
    telegram.guardarPreferencias.and.returnValue(pendiente);
    component.form.setValue({ cuentaId: null, categoriaId: null });
    component.guardar(); component.guardar();
    expect(telegram.guardarPreferencias).toHaveBeenCalledTimes(1);
    expect(telegram.guardarPreferencias).toHaveBeenCalledWith({ cuentaId: null, categoriaId: null });
    pendiente.next({ cuentaId: null, categoriaId: null });
    expect(component.guardando()).toBeFalse();
  });

  it('un error al guardar conserva la elección para corregirla o reintentar', () => {
    telegram.guardarPreferencias.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Cuenta no disponible' } })));
    component.form.setValue({ cuentaId: 99, categoriaId: 11 });
    component.form.markAsDirty();
    component.guardar(); fixture.detectChanges();
    expect(component.form.controls.cuentaId.value).toBe(99);
    expect(component.form.dirty).toBeTrue();
    expect(component.cuentaNoDisponible).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Cuenta no disponible');
    expect(fixture.nativeElement.textContent).toContain('Cuenta guardada no disponible');
  });

  it('no guarda sin conexión', () => {
    sinConexion.set(true);
    component.guardar();
    expect(telegram.guardarPreferencias).not.toHaveBeenCalled();
  });

  it('si falla la carga no ofrece guardar valores vacíos sobre los anteriores', () => {
    telegram.obtenerPreferencias.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    fixture.destroy();
    fixture = TestBed.createComponent(PreferenciasTelegramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.guardar();
    expect(component.cargado()).toBeFalse();
    expect(telegram.guardarPreferencias).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });
});
