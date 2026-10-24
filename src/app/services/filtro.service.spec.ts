import {FiltroService} from './filtro.service';
import {FiltroTransacciones} from '../models/transaccion.model';

describe('FiltroService orden persistente', () => {
  const clave = 'transacciones_filtros';
  const filtros = {tipo: 'TODOS'} as FiltroTransacciones;
  afterEach(() => localStorage.removeItem(clave));

  it('restaura el orden desde una nueva instancia', () => {
    new FiltroService().guardarFiltros(filtros, 'PERIODO_FACTURACION', 'monto,desc');
    expect(new FiltroService().obtenerFiltros()?.sort).toBe('monto,desc');
  });

  it('admite datos antiguos y descarta órdenes inválidos', () => {
    for (const sort of [undefined, 'acciones,asc', 'monto,otro', {}]) {
      localStorage.setItem(clave, JSON.stringify({filtros, modoBusqueda: 'PERIODO_FACTURACION', sort}));
      expect(new FiltroService().obtenerFiltros()?.sort).toBeNull();
    }
  });
});
