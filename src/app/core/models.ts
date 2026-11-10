export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Permission {
  permisoId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  habilitado: boolean;
}

export interface SessionUser {
  usuarioId: number;
  rolId: number;
  nombreRol: string;
  nombreUsuario: string;
  nombreCompleto: string;
  correo: string | null;
  debeCambiarPassword: boolean;
}

export interface LoginData {
  usuario: SessionUser;
  permisos: Permission[];
  token: string;
}

export interface UsuarioAdmin {
  usuarioId: number;
  nombreUsuario: string;
  nombres: string;
  apellidos: string | null;
  correo: string | null;
  telefono: string | null;
  rolId: number;
  nombreRol: string;
  activo: boolean;
  debeCambiarPassword: boolean;
  fechaCreacion: string;
  ultimoAcceso: string | null;
}

export interface RolUsuario { rolId: number; nombre: string; }

export interface RolAdmin {
  rolId: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  usuariosActivos: number;
  permisosHabilitados: number;
}

export interface PermisoRol {
  permisoId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  habilitado: boolean;
}

export interface GuardarRol { nombre: string; descripcion: string | null; permisoIds: number[]; }

export interface GuardarUsuario {
  nombreUsuario: string;
  nombres: string;
  apellidos: string | null;
  correo: string | null;
  telefono: string | null;
  rolId: number;
}

export interface Cuenta {
  usuarioId: number;
  nombreUsuario: string;
  nombres: string;
  apellidos: string | null;
  correo: string | null;
  telefono: string | null;
  nombreRol: string;
}

export interface ActualizarCuenta {
  nombres: string;
  apellidos: string | null;
  correo: string | null;
  telefono: string | null;
}

export interface GuardarProducto {
  codigoProducto: string;
  nombre: string;
  permitePesoNeto: boolean;
  permitePesoBruto: boolean;
  pesoNetoBolsaLbs: number | null;
  pesoBrutoBolsaLbs: number | null;
  sePesaAlDespachar: boolean;
}

export interface AjustarInventario {
  stockDisponibleLbs: number;
  cantidadBolsasDisponible: number;
  observacion: string;
}

export interface Cliente {
  clienteId: number;
  codigoCliente: string;
  nombreComercial: string;
  razonSocial: string | null;
  nit: string | null;
  contacto: string | null;
  telefono: string | null;
  direccion: string | null;
  observaciones: string | null;
  activo: boolean;
}

export interface GuardarCliente {
  codigoCliente: string;
  nombreComercial: string;
  razonSocial: string | null;
  nit: string | null;
  contacto: string | null;
  telefono: string | null;
  direccion: string | null;
  observaciones: string | null;
}

export interface Producto {
  productoId: number;
  codigoProducto: string;
  nombre: string;
  permitePesoNeto: boolean;
  permitePesoBruto: boolean;
  pesoNetoBolsaLbs: number | null;
  pesoBrutoBolsaLbs: number | null;
  sePesaAlDespachar: boolean;
  activo: boolean;
}

export interface Inventario extends Producto {
  inventarioId: number;
  stockDisponibleLbs: number;
  stockReservadoLbs: number;
  stockTotalLbs: number;
  cantidadBolsasDisponible: number;
  cantidadBolsasReservada: number;
  cantidadBolsasTotal: number;
  ultimaActualizacion: string;
}

export interface PedidoResumen {
  pedidoId: number;
  usuarioCreadorId: number | null;
  clienteId: number;
  codigoCliente: string;
  nombreComercial: string;
  codigoEstado: string;
  estadoPedido: string;
  fechaPedido: string;
  fechaEntregaProgramada: string | null;
  totalProductos: number;
  totalLibrasReservadas: number;
  totalBolsasReservadas: number;
  usuarioCreador: string | null;
  usuarioAutoriza: string | null;
  telefono: string | null;
  direccion: string | null;
}

export interface PedidoDetalle {
  pedidoDetalleId: number;
  productoId: number;
  codigoProducto: string;
  producto: string;
  tipoPeso: string;
  tipoPesoDescripcion: string;
  cantidadSolicitadaLbs: number;
  cantidadSolicitadaBolsas: number;
  cantidadReservadaLbs: number;
  cantidadReservadaBolsas: number;
  ultimaRevisionOK: boolean | null;
  comentarioRevision: string | null;
}

export interface Pedido extends PedidoResumen {
  observaciones: string | null;
  resultadoAutorizacion: string | null;
  comentarioAutorizacion: string | null;
  entregado: boolean | null;
  detalles: PedidoDetalle[];
}

export interface PedidoFiltro {
  textoBusqueda?: string;
  clienteId?: number | null;
  fechaDesde?: string;
  fechaHasta?: string;
  incluirDevueltos?: boolean;
}

export interface RutaFila {
  pedidoId: number;
  pedidoDetalleId: number;
  fechaPedido: string;
  fechaEntregaProgramada: string | null;
  nombreComercial: string;
  codigoCliente: string;
  contacto: string | null;
  telefono: string | null;
  direccion: string | null;
  producto: string;
  codigoProducto: string;
  tipoPesoDescripcion: string;
  cantidadReservadaLbs: number;
  cantidadReservadaBolsas: number;
}

export interface EstadoResultado {
  pedidoId: number;
  estadoPedido: string;
  resultado: string | null;
  mensaje: string;
}
