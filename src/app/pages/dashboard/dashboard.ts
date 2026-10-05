import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Cliente, Inventario, PedidoResumen, Producto } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <div class="page-heading"><div><p class="section-kicker">RESUMEN OPERATIVO</p><h1>Buen día, {{ auth.user()?.nombreCompleto?.split(' ')?.[0] }}</h1><p>Consultá los datos principales y continuá con las operaciones del día.</p></div>
      @if (auth.can('CREAR_PEDIDOS')) { <a class="btn btn-primary" routerLink="/pedidos/nuevo">＋ Nuevo pedido</a> }
    </div>
    @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
    <div class="stats-grid">
      @if (auth.can('VER_CLIENTES')) { <a class="stat-card" routerLink="/clientes"><span class="stat-icon blue">◎</span><small>Clientes activos</small><strong>{{ loading() ? '…' : clientes().length }}</strong><span>Ver clientes →</span></a> }
      @if (auth.can('VER_PRODUCTOS')) { <a class="stat-card" routerLink="/productos"><span class="stat-icon orange">◫</span><small>Productos activos</small><strong>{{ loading() ? '…' : productos().length }}</strong><span>Ver productos →</span></a> }
      @if (auth.can('VER_INVENTARIO')) { <a class="stat-card" routerLink="/inventario"><span class="stat-icon teal">▣</span><small>Libras disponibles</small><strong>{{ loading() ? '…' : totalLibras().toLocaleString('es-GT') }}</strong><span>Ver inventario →</span></a> }
      @if (auth.can('VER_PEDIDOS_PENDIENTES')) { <a class="stat-card" routerLink="/pedidos"><span class="stat-icon violet">▤</span><small>Por autorizar</small><strong>{{ loading() ? '…' : pendientes().length }}</strong><span>Ver pedidos →</span></a> }
    </div>
    <div class="dashboard-grid">
      <section class="surface"><div class="surface-header"><div><p class="section-kicker">ACCESOS RÁPIDOS</p><h2>Trabajo diario</h2></div></div>
        <div class="quick-links">
          @if (auth.can('CREAR_PEDIDOS')) { <a routerLink="/pedidos/nuevo"><span>＋</span><div><strong>Crear pedido</strong><small>Reservar producto para un cliente</small></div><b>→</b></a> }
          @if (auth.can('VER_PEDIDOS_PENDIENTES')) { <a routerLink="/pedidos"><span>▤</span><div><strong>Revisar pendientes</strong><small>Consultar pedidos por autorización</small></div><b>→</b></a> }
          @if (auth.can('VER_PEDIDOS_PENDIENTES_ENTREGA')) { <a routerLink="/entregas"><span>⇥</span><div><strong>Entregas</strong><small>Pedidos listos para confirmar</small></div><b>→</b></a> }
          @if (auth.can('EXPORTAR_PDF_RUTA')) { <a routerLink="/ruta"><span>▧</span><div><strong>Hoja de ruta</strong><small>Preparar e imprimir el recorrido</small></div><b>→</b></a> }
        </div>
      </section>
      <section class="surface"><div class="surface-header"><div><p class="section-kicker">ESTADO DEL SISTEMA</p><h2>Información útil</h2></div></div>
        <div class="info-list"><p><span class="online-dot"></span> Sesión activa como <strong>{{ auth.user()?.nombreRol }}</strong></p><p>Las acciones disponibles dependen de los permisos de tu usuario.</p><p>Los pedidos nuevos reservan existencias al guardarse; las entregas descuentan el stock reservado.</p></div>
      </section>
    </div>
  `
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly clientes = signal<Cliente[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly inventario = signal<Inventario[]>([]);
  readonly pendientes = signal<PedidoResumen[]>([]);
  readonly totalLibras = () => this.inventario().reduce((sum, item) => sum + item.stockDisponibleLbs, 0);

  ngOnInit(): void {
    forkJoin({
      clientes: this.auth.can('VER_CLIENTES') ? this.api.clientes() : of(null),
      productos: this.auth.can('VER_PRODUCTOS') ? this.api.productos() : of(null),
      inventario: this.auth.can('VER_INVENTARIO') ? this.api.inventario() : of(null),
      pendientes: this.auth.can('VER_PEDIDOS_PENDIENTES') ? this.api.pendientes() : of(null)
    }).subscribe({
      next: data => {
        this.clientes.set(data.clientes?.data ?? []);
        this.productos.set(data.productos?.data ?? []);
        this.inventario.set(data.inventario?.data ?? []);
        this.pendientes.set(data.pendientes?.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el resumen. Revisá la conexión con el API.');
        this.loading.set(false);
      }
    });
  }
}
