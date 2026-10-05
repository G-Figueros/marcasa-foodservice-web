import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  ApiResponse, Cliente, EstadoResultado, Inventario, Pedido, PedidoFiltro,
  PedidoResumen, Producto, RutaFila
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  clientes(textoBusqueda = '') {
    return this.http.get<ApiResponse<Cliente[]>>('/api/clientes', { params: { textoBusqueda } });
  }

  productos(textoBusqueda = '') {
    return this.http.get<ApiResponse<Producto[]>>('/api/productos', { params: { textoBusqueda } });
  }

  inventario(textoBusqueda = '') {
    return this.http.get<ApiResponse<Inventario[]>>('/api/inventario', { params: { textoBusqueda } });
  }

  pendientes(filtro: PedidoFiltro = {}) {
    return this.http.get<ApiResponse<PedidoResumen[]>>('/api/pedidos/pendientes-autorizacion', { params: this.params(filtro) });
  }

  autorizados(filtro: PedidoFiltro = {}) {
    return this.http.get<ApiResponse<PedidoResumen[]>>('/api/pedidos/autorizados-ruta', { params: this.params(filtro) });
  }

  entregas(filtro: PedidoFiltro = {}) {
    return this.http.get<ApiResponse<PedidoResumen[]>>('/api/entregas/pendientes', { params: this.params(filtro) });
  }

  ruta(filtro: PedidoFiltro = {}) {
    return this.http.get<ApiResponse<RutaFila[]>>('/api/entregas/datos-ruta', { params: this.params(filtro) });
  }

  pedido(id: number) {
    return this.http.get<ApiResponse<Pedido>>(`/api/pedidos/${id}`);
  }

  crearPedido(data: {
    clienteId: number; fechaEntregaProgramada: string | null; observaciones: string | null;
    detalle: { productoId: number; tipoPeso: string; cantidadSolicitadaLbs: number | null; cantidadSolicitadaBolsas: number | null }[];
  }) {
    return this.http.post<ApiResponse<{ pedidoId: number; mensaje: string }>>('/api/pedidos', data);
  }

  autorizar(id: number, data: { comentario: string | null; detalleAutorizacion: { pedidoDetalleId: number; marcadoOK: boolean; comentario: string | null }[] }) {
    return this.http.post<ApiResponse<EstadoResultado>>(`/api/pedidos/${id}/autorizar`, data);
  }

  cambiarEstado(id: number, action: 'devolver-correccion' | 'solicitar-cancelacion' | 'aprobar-cancelacion', comentario: string) {
    return this.http.post<ApiResponse<EstadoResultado>>(`/api/pedidos/${id}/${action}`, { comentario });
  }

  confirmarEntrega(id: number, comentario: string) {
    return this.http.post<ApiResponse<EstadoResultado>>(`/api/entregas/${id}/confirmar`, { comentario });
  }

  private params(filtro: PedidoFiltro): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filtro)) {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return params;
  }
}
