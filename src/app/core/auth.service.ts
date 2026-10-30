import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { ApiResponse, LoginData } from './models';

const SESSION_KEY = 'marcasa.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<LoginData | null>(this.restore());

  readonly session = this.state.asReadonly();
  readonly user = computed(() => this.state()?.usuario ?? null);
  // Se evalúa al consultar para que el vencimiento del JWT se respete sin recargar la página.
  readonly isAuthenticated = (): boolean => {
    const token = this.state()?.token;
    return !!token && this.tokenIsValid(token);
  };

  login(usuario: string, password: string) {
    return this.http.post<ApiResponse<LoginData>>('/api/Auth/login', { usuario, password }).pipe(
      tap(response => {
        if (response.success && response.data?.token) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(response.data));
          this.state.set(response.data);
        }
      })
    );
  }

  changePassword(passwordActual: string, passwordNuevo: string, confirmacion: string) {
    return this.http.post<ApiResponse<unknown>>('/api/Auth/change-password',
      { passwordActual, passwordNuevo, confirmacion });
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.state.set(null);
  }

  token(): string | null {
    return this.isAuthenticated() ? this.state()?.token ?? null : null;
  }

  can(permission: string): boolean {
    return this.isAuthenticated() && !!this.state()?.permisos.some(p => p.codigo === permission && p.habilitado);
  }

  canAny(...permissions: string[]): boolean {
    return permissions.some(permission => this.can(permission));
  }

  private restore(): LoginData | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      const saved = raw ? JSON.parse(raw) as LoginData : null;
      if (saved?.token && this.tokenIsValid(saved.token)) return saved;
    } catch {
      // Una sesión dañada se descarta sin impedir que cargue la aplicación.
    }
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }

  private tokenIsValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
