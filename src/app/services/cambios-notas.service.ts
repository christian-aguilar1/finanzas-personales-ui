import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CambiosNotasService {
  private readonly cambios = new Subject<void>();
  readonly cambios$ = this.cambios.asObservable();
  notificar(): void { this.cambios.next(); }
}
