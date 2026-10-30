import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  return auth.user()?.debeCambiarPassword ? router.createUrlTree(['/cambiar-contrasena']) : true;
};

export const signedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? router.createUrlTree([auth.user()?.debeCambiarPassword ? '/cambiar-contrasena' : '/panel']) : true;
};

export const permissionGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const permissions = (route.data['permissions'] as string[] | undefined) ?? [];
  const requiredRole = route.data['role'] as string | undefined;
  return (!requiredRole || auth.user()?.nombreRol === requiredRole) &&
    (permissions.length === 0 || auth.canAny(...permissions))
    ? true
    : router.createUrlTree(['/panel']);
};
