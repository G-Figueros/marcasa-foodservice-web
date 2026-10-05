import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Pedido } from '../../core/models';

interface ReviewLine {
  pedidoDetalleId: number;
  marcadoOK: boolean;
  comentario: string;
}

@Component({
  selector: 'app-order-detail',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-heading"><div><p class="section-kicker">PEDIDOS / DETALLE</p><h1>Pedido #{{ id }}</h1><p>Revisá productos, estado y acciones disponibles.</p></div><a routerLink="/pedidos" class="btn btn-outline">← Volver a pedidos</a></div>
    @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
    @if (success()) { <div class="notice success" role="status">{{ success() }}</div> }
    @if (loading()) { <div class="surface empty-state">Cargando pedido…</div> }
    @else if (pedido(); as item) {
      <div class="detail-grid">
        <section class="surface"><div class="surface-header"><div><p class="section-kicker">INFORMACIÓN GENERAL</p><h2>Datos del pedido</h2></div><span class="status-pill" [class.good]="item.codigoEstado === 'PENDIENTE_ENTREGA' || item.codigoEstado === 'ENTREGADO'" [class.warn]="item.codigoEstado === 'DEVUELTO_CORRECCION'">{{ item.estadoPedido }}</span></div>
          <div class="detail-list"><div><small>Cliente</small><strong>{{ item.nombreComercial }}</strong></div><div><small>Código</small><strong>{{ item.codigoCliente }}</strong></div><div><small>Fecha del pedido</small><strong>{{ date(item.fechaPedido) }}</strong></div><div><small>Entrega programada</small><strong>{{ date(item.fechaEntregaProgramada) }}</strong></div><div><small>Creado por</small><strong>{{ item.usuarioCreador || '—' }}</strong></div><div><small>Autorizado por</small><strong>{{ item.usuarioAutoriza || '—' }}</strong></div></div>
          @if (item.observaciones) { <div class="detail-note"><small>Observaciones</small><p>{{ item.observaciones }}</p></div> }
        </section>
        <section class="surface summary-card"><p class="section-kicker">RESERVA DEL PEDIDO</p><strong class="large-number">{{ item.totalLibrasReservadas.toLocaleString('es-GT') }} <span>lb</span></strong><p>{{ item.totalProductos }} productos · {{ item.totalBolsasReservadas }} bolsas</p><div class="summary-divider"></div><p>La reserva se descuenta del disponible al crear el pedido.</p></section>
      </div>

      <section class="surface"><div class="surface-header"><div><p class="section-kicker">DETALLE</p><h2>Productos solicitados</h2></div></div>
        <div class="table-wrap"><table><thead><tr><th>Producto</th><th>Peso</th><th>Solicitado</th><th>Bolsas</th><th>Reservado</th><th>Última revisión</th></tr></thead>
          <tbody>@for (line of item.detalles; track line.pedidoDetalleId) { <tr><td><strong>{{ line.producto }}</strong><small>{{ line.codigoProducto }}</small></td><td>{{ line.tipoPesoDescripcion }}</td><td>{{ line.cantidadSolicitadaLbs }} lb</td><td>{{ line.cantidadSolicitadaBolsas }}</td><td>{{ line.cantidadReservadaLbs }} lb</td><td>{{ line.ultimaRevisionOK === null ? 'Sin revisión' : line.ultimaRevisionOK ? 'Aprobado' : 'Observado' }}</td></tr> }</tbody>
        </table></div>
      </section>

      @if (canAuthorize(item)) {
        <section class="surface form-section"><div class="surface-header"><div><p class="section-kicker">AUTORIZACIÓN</p><h2>Revisión de productos</h2></div></div>
          <p class="muted">Marcá cada producto como correcto. Si alguno queda observado, el pedido volverá para corrección.</p>
          @for (line of item.detalles; track line.pedidoDetalleId; let i = $index) {
            <div class="review-line"><label class="checkbox-label"><input type="checkbox" [(ngModel)]="review[i].marcadoOK"><span><strong>{{ line.producto }}</strong><small>{{ line.tipoPesoDescripcion }} · {{ line.cantidadReservadaLbs }} lb reservadas</small></span></label><input [(ngModel)]="review[i].comentario" maxlength="500" placeholder="Comentario de revisión (opcional)"></div>
          }
          <label>Comentario general<textarea [(ngModel)]="comentario" maxlength="500" rows="2" placeholder="Notas de autorización"></textarea></label>
          <div class="form-actions"><button class="btn btn-primary" [disabled]="working()" (click)="autorizar()">{{ working() ? 'Procesando…' : 'Procesar autorización' }}</button></div>
        </section>
      }

      @if (hasActions(item)) {
        <section class="surface form-section"><div class="surface-header"><div><p class="section-kicker">OPERACIONES</p><h2>Otras acciones</h2></div></div>
          <label>Comentario para la acción<textarea [(ngModel)]="comentarioAccion" maxlength="500" rows="2" placeholder="Motivo o detalle adicional"></textarea></label>
          <div class="action-row">
            @if (canReturn(item)) { <button class="btn btn-outline" [disabled]="working()" (click)="action('devolver-correccion')">Devolver a corrección</button> }
            @if (canRequestCancel(item)) { <button class="btn btn-danger-outline" [disabled]="working()" (click)="action('solicitar-cancelacion')">Solicitar cancelación</button> }
            @if (canApproveCancel(item)) { <button class="btn btn-danger" [disabled]="working()" (click)="action('aprobar-cancelacion')">Aprobar cancelación</button> }
            @if (canDeliver(item)) { <button class="btn btn-primary" [disabled]="working()" (click)="confirmDelivery()">Confirmar entrega</button> }
          </div>
        </section>
      }
    }
  `
})
export class OrderDetail implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly pedido = signal<Pedido | null>(null);
  readonly loading = signal(true);
  readonly working = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  review: ReviewLine[] = [];
  comentario = '';
  comentarioAccion = '';

  ngOnInit(): void { this.load(); }
  date(value: string | null): string { return value ? new Date(value).toLocaleDateString('es-GT') : '—'; }
  canAuthorize(p: Pedido): boolean { return this.auth.can('AUTORIZAR_PEDIDOS') && p.usuarioCreadorId !== this.auth.user()?.usuarioId && ['PENDIENTE_AUTORIZACION', 'DEVUELTO_CORRECCION'].includes(p.codigoEstado); }
  canReturn(p: Pedido): boolean { return this.auth.can('DEVOLVER_PEDIDOS_CORRECCION') && ['PENDIENTE_AUTORIZACION', 'AUTORIZADO_RUTA', 'PENDIENTE_ENTREGA'].includes(p.codigoEstado); }
  canRequestCancel(p: Pedido): boolean { return this.auth.can('SOLICITAR_CANCELACION_PEDIDOS') && !['ENTREGADO', 'CANCELADO', 'CANCELACION_SOLICITADA'].includes(p.codigoEstado); }
  canApproveCancel(p: Pedido): boolean { return this.auth.can('APROBAR_CANCELACION_PEDIDOS') && p.codigoEstado === 'CANCELACION_SOLICITADA'; }
  canDeliver(p: Pedido): boolean { return this.auth.can('CONFIRMAR_ENTREGA') && ['PENDIENTE_ENTREGA', 'AUTORIZADO_RUTA'].includes(p.codigoEstado); }
  hasActions(p: Pedido): boolean { return this.canReturn(p) || this.canRequestCancel(p) || this.canApproveCancel(p) || this.canDeliver(p); }

  load(): void {
    this.loading.set(true);
    this.api.pedido(this.id).subscribe({
      next: response => {
        this.pedido.set(response.data);
        this.review = response.data.detalles.map(line => ({ pedidoDetalleId: line.pedidoDetalleId, marcadoOK: true, comentario: '' }));
        this.loading.set(false);
      },
      error: error => { this.error.set(error.status === 404 ? 'No se encontró el pedido.' : error.error?.message || 'No se pudo cargar el pedido.'); this.loading.set(false); }
    });
  }

  autorizar(): void {
    if (!this.review.length) return;
    this.working.set(true); this.error.set(''); this.success.set('');
    this.api.autorizar(this.id, { comentario: this.comentario.trim() || null, detalleAutorizacion: this.review.map(line => ({ pedidoDetalleId: line.pedidoDetalleId, marcadoOK: line.marcadoOK, comentario: line.comentario.trim() || null })) }).subscribe({
      next: response => this.finish(response.message), error: error => this.fail(error)
    });
  }

  action(action: 'devolver-correccion' | 'solicitar-cancelacion' | 'aprobar-cancelacion'): void {
    if (action === 'aprobar-cancelacion' && !confirm('Se liberará la reserva del pedido. ¿Continuar?')) return;
    this.working.set(true); this.error.set(''); this.success.set('');
    this.api.cambiarEstado(this.id, action, this.comentarioAccion.trim()).subscribe({
      next: response => this.finish(response.message), error: error => this.fail(error)
    });
  }

  confirmDelivery(): void {
    if (!confirm('Se confirmará la entrega y se descontará el stock reservado. ¿Continuar?')) return;
    this.working.set(true); this.error.set(''); this.success.set('');
    this.api.confirmarEntrega(this.id, this.comentarioAccion.trim()).subscribe({
      next: response => this.finish(response.message), error: error => this.fail(error)
    });
  }

  private finish(message: string): void { this.working.set(false); this.success.set(message); this.load(); }
  private fail(error: { error?: { message?: string } }): void { this.working.set(false); this.error.set(error.error?.message || 'No se pudo completar la acción.'); }
}
