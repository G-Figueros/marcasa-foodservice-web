import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <aside class="sidebar" [class.open]="menuOpen()">
        <a class="sidebar-brand" routerLink="/panel" (click)="menuOpen.set(false)">
          <span class="brand-mark">M</span>
          <span><strong>Marcasa</strong><small>FoodService</small></span>
        </a>
        <div class="sidebar-label">OPERACIONES</div>
        <nav aria-label="Navegación principal">
          <a routerLink="/panel" routerLinkActive="active" (click)="menuOpen.set(false)"><span>⌂</span> Panel general</a>
          @if (auth.can('VER_CLIENTES')) { <a routerLink="/clientes" routerLinkActive="active" (click)="menuOpen.set(false)"><span>◎</span> Clientes</a> }
          @if (auth.can('VER_PRODUCTOS')) { <a routerLink="/productos" routerLinkActive="active" (click)="menuOpen.set(false)"><span>◫</span> Productos</a> }
          @if (auth.can('VER_INVENTARIO')) { <a routerLink="/inventario" routerLinkActive="active" (click)="menuOpen.set(false)"><span>▣</span> Inventario</a> }
          @if (auth.can('VER_PEDIDOS_PENDIENTES')) { <a routerLink="/pedidos" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="menuOpen.set(false)"><span>▤</span> Pedidos</a> }
          @if (auth.can('VER_PEDIDOS_AUTORIZADOS')) { <a routerLink="/autorizados" routerLinkActive="active" (click)="menuOpen.set(false)"><span>✓</span> Autorizados</a> }
          @if (auth.can('VER_PEDIDOS_PENDIENTES_ENTREGA')) { <a routerLink="/entregas" routerLinkActive="active" (click)="menuOpen.set(false)"><span>⇥</span> Entregas</a> }
          @if (auth.can('EXPORTAR_PDF_RUTA')) { <a routerLink="/ruta" routerLinkActive="active" (click)="menuOpen.set(false)"><span>▧</span> Hoja de ruta</a> }
          @if (auth.user()?.nombreRol === 'Gerente' && auth.can('VER_USUARIOS')) { <a routerLink="/usuarios" routerLinkActive="active" (click)="menuOpen.set(false)"><span>♙</span> Usuarios</a> }
          @if (auth.user()?.nombreRol === 'Gerente' && auth.can('VER_ROLES')) { <a routerLink="/roles" routerLinkActive="active" (click)="menuOpen.set(false)"><span>♧</span> Roles</a> }
        </nav>
        <div class="sidebar-foot"><span class="online-dot"></span> Conectado al sistema</div>
      </aside>

      @if (menuOpen()) { <button class="menu-backdrop" aria-label="Cerrar menú" (click)="menuOpen.set(false)"></button> }
      <div class="app-main">
        <header class="topbar">
          <button class="menu-toggle" aria-label="Abrir menú" (click)="menuOpen.set(!menuOpen())">☰</button>
          <div class="topbar-context"><span class="eyebrow">MARCASA FOODSERVICE</span><strong>Sistema de gestión</strong></div>
          <div class="topbar-user">
            <span class="avatar">{{ initials() }}</span>
            <span class="user-meta"><strong>{{ auth.user()?.nombreCompleto }}</strong><small>{{ auth.user()?.nombreRol }}</small></span>
            <a class="btn btn-quiet" routerLink="/cambiar-contrasena" title="Cambiar contraseña">Contraseña</a>
            <button class="btn btn-quiet" (click)="logout()" title="Cerrar sesión">Salir</button>
          </div>
        </header>
        <main class="page-content"><router-outlet /></main>
      </div>
    </div>
  `
})
export class Shell {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);

  initials(): string {
    return (this.auth.user()?.nombreCompleto || 'U').split(' ').slice(0, 2)
      .map(part => part.charAt(0).toUpperCase()).join('');
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
