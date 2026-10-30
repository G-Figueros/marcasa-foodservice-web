import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChangePassword } from './change-password';

describe('Cambio de contraseña', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideRouter([])]
  }));

  it('solo habilita el guardado cuando cumple todos los requisitos y coincide la confirmación', () => {
    const page = TestBed.runInInjectionContext(() => new ChangePassword());
    page.actual = 'AnteriorSegura2026*';
    page.nuevo = 'NuevaSegura2026*';
    page.confirmacion = 'otra';
    expect(page.passwordReady()).toBe(false);
    expect(page.passwordsMatch()).toBe(false);
    page.confirmacion = page.nuevo;
    expect(page.passwordReady()).toBe(true);
    page.nuevo = 'Temporal2026*';
    page.confirmacion = page.nuevo;
    expect(page.passwordReady()).toBe(false);
  });
});
