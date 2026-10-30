import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { OrderDetail } from './order-detail';

describe('Revisión de productos', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } }]
  }));

  it('impide autorizar mientras un producto siga sin confirmar', () => {
    const page = TestBed.runInInjectionContext(() => new OrderDetail());
    page.review = [
      { pedidoDetalleId: 1, marcadoOK: true, comentario: '' },
      { pedidoDetalleId: 2, marcadoOK: false, comentario: '' }
    ];
    expect(page.allReviewed()).toBe(false);
    page.autorizar();
    expect(page.error()).toContain('todos los productos');
    expect(page.working()).toBe(false);
    page.review[1].marcadoOK = true;
    expect(page.allReviewed()).toBe(true);
  });
});
