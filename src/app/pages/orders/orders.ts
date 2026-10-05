import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PedidoFiltro, PedidoResumen } from '../../core/models';

type Mode = 'pending' | 'authorized' | 'delivery';

@Component({
  selector: 'app-orders',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-heading"><div><p class="section-kicker">GESTIÓN DE PEDIDOS</p><h1>{{ title }}</h1><p>{{ description }}</p></div>
      @if (auth.can('CREAR_PEDIDOS')) { <a routerLink="/pedidos/nuevo" class="btn btn-primary">＋ Nuevo pedido</a> }
    </div>
    <section class="surface">
      <div class="filter-grid">
        <label>Buscar<input [(ngModel)]="filter.textoBusqueda" (keyup.enter)="load()" placeholder="Número, código o cliente"></label>
        <label>Desde<input type="date" [(ngModel)]="filter.fechaDesde"></label>
        <label>Hasta<input type="date" [(ngModel)]="filter.fechaHasta"></label>
        <button class="btn btn-primary" (click)="load()">Aplicar filtros</button>
        <button class="btn btn-outline" (click)="clear()">Limpiar</button>
      </div>
      @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
      @if (loading()) { <div class="empty-state">Cargando pedidos…</div> }
      @else if (items().length === 0) { <div class="empty-state"><strong>No hay pedidos en esta lista</strong><span>Podés cambiar los filtros o volver más tarde.</span></div> }
      @else { <div class="table-wrap"><table>
        <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Entrega prevista</th><th>Productos</th><th>Reserva</th><th>Estado</th><th></th></tr></thead>
        <tbody>@for (item of items(); track item.pedidoId) { <tr>
          <td><strong>#{{ item.pedidoId }}</strong></td>
          <td><strong>{{ item.nombreComercial }}</strong><small>{{ item.codigoCliente }}</small></td>
          <td>{{ date(item.fechaPedido) }}</td><td>{{ date(item.fechaEntregaProgramada) }}</td>
          <td>{{ item.totalProductos }}</td><td>{{ item.totalLibrasReservadas.toLocaleString('es-GT') }} lb</td>
          <td><span class="status-pill" [class.good]="item.codigoEstado === 'PENDIENTE_ENTREGA'" [class.warn]="item.codigoEstado === 'DEVUELTO_CORRECCION'">{{ item.estadoPedido }}</span></td>
          <td><a class="text-link" [routerLink]="['/pedidos', item.pedidoId]">Ver detalle →</a></td>
        </tr> }</tbody>
      </table></div> }
      <div class="table-footer">{{ items().length }} pedidos encontrados</div>
    </section>
  `
})
export class Orders implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly mode = this.route.snapshot.data['mode'] as Mode;
  readonly title = { pending: 'Pendientes de autorización', authorized: 'Autorizados para ruta', delivery: 'Pendientes de entrega' }[this.mode];
  readonly description = { pending: 'Pedidos por revisar y pedidos devueltos para corrección.', authorized: 'Pedidos aprobados que pueden incluirse en la ruta.', delivery: 'Pedidos listos para entregar al cliente.' }[this.mode];
  readonly items = signal<PedidoResumen[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  filter: PedidoFiltro = {};

  ngOnInit(): void { this.load(); }
  date(value: string | null): string { return value ? new Date(value).toLocaleDateString('es-GT') : '—'; }
  clear(): void { this.filter = {}; this.load(); }

  load(): void {
    if (this.filter.fechaDesde && this.filter.fechaHasta && this.filter.fechaDesde > this.filter.fechaHasta) {
      this.error.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.error.set(''); this.loading.set(true);
    const request = this.mode === 'pending' ? this.api.pendientes(this.filter)
      : this.mode === 'authorized' ? this.api.autorizados(this.filter) : this.api.entregas(this.filter);
    request.subscribe({
      next: response => { this.items.set(response.data); this.loading.set(false); },
      error: error => { this.error.set(error.error?.message || 'No se pudieron cargar los pedidos.'); this.loading.set(false); }
    });
  }
}
