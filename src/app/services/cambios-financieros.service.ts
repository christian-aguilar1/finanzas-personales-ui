import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/** Actualiza las vistas abiertas cuando el chat guarda una transacción. No persiste datos. */
@Injectable({ providedIn: 'root' })
export class CambiosFinancierosService {
  private readonly cambios = new Subject<void>();
  readonly cambios$ = this.cambios.asObservable();

  notificar(): void {
    this.cambios.next();
  }
}
