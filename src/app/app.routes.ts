import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { authGuard, guestGuard, permissionGuard, signedInGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'panel',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard]
  },
  { path: 'cambiar-contrasena', loadComponent: () => import('./pages/change-password/change-password').then(m => m.ChangePassword), canActivate: [signedInGuard] },
  {
    path: '',
    loadComponent: () => import('./pages/shell/shell').then(m => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: 'panel', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'usuarios', loadComponent: () => import('./pages/users/users').then(m => m.Users), data: { role: 'Gerente', permissions: ['VER_USUARIOS'] }, canActivate: [permissionGuard] },
      { path: 'roles', loadComponent: () => import('./pages/roles/roles').then(m => m.Roles), data: { role: 'Gerente', permissions: ['VER_ROLES'] }, canActivate: [permissionGuard] },
      { path: 'clientes', loadComponent: () => import('./pages/catalog/catalog').then(m => m.Catalog), data: { kind: 'clientes', permissions: ['VER_CLIENTES'] }, canActivate: [permissionGuard] },
      { path: 'productos', loadComponent: () => import('./pages/catalog/catalog').then(m => m.Catalog), data: { kind: 'productos', permissions: ['VER_PRODUCTOS'] }, canActivate: [permissionGuard] },
      { path: 'inventario', loadComponent: () => import('./pages/catalog/catalog').then(m => m.Catalog), data: { kind: 'inventario', permissions: ['VER_INVENTARIO'] }, canActivate: [permissionGuard] },
      { path: 'pedidos', loadComponent: () => import('./pages/orders/orders').then(m => m.Orders), data: { mode: 'pending', permissions: ['VER_PEDIDOS_PENDIENTES'] }, canActivate: [permissionGuard] },
      { path: 'pedidos/nuevo', loadComponent: () => import('./pages/order-create/order-create').then(m => m.OrderCreate), data: { permissions: ['CREAR_PEDIDOS'] }, canActivate: [permissionGuard] },
      { path: 'pedidos/:id', loadComponent: () => import('./pages/order-detail/order-detail').then(m => m.OrderDetail), data: { permissions: ['VER_PEDIDOS_PENDIENTES', 'VER_PEDIDOS_AUTORIZADOS', 'VER_PEDIDOS_PENDIENTES_ENTREGA'] }, canActivate: [permissionGuard] },
      { path: 'autorizados', loadComponent: () => import('./pages/orders/orders').then(m => m.Orders), data: { mode: 'authorized', permissions: ['VER_PEDIDOS_AUTORIZADOS'] }, canActivate: [permissionGuard] },
      { path: 'entregas', loadComponent: () => import('./pages/orders/orders').then(m => m.Orders), data: { mode: 'delivery', permissions: ['VER_PEDIDOS_PENDIENTES_ENTREGA'] }, canActivate: [permissionGuard] },
      { path: 'ruta', loadComponent: () => import('./pages/route-sheet/route-sheet').then(m => m.RouteSheet), data: { permissions: ['EXPORTAR_PDF_RUTA'] }, canActivate: [permissionGuard] }
    ]
  },
  {
    path: '**',
    redirectTo: 'panel'
  }
];
