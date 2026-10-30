import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);

  public mostrarPassword = false;
  public cargando = false;
  public mensajeError = '';

  public loginForm = this.formBuilder.group({
    usuario: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(60),
        this.usuarioSeguroValidator
      ]
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(100)
      ]
    ]
  });

  public get usuario(): AbstractControl | null {
    return this.loginForm.get('usuario');
  }

  public get password(): AbstractControl | null {
    return this.loginForm.get('password');
  }

  public alternarPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  public ingresar(): void {
    this.mensajeError = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const usuarioLimpio = this.limpiarUsuario(this.loginForm.value.usuario ?? '');
    const password = this.loginForm.value.password ?? '';

    this.cargando = true;
    this.auth.login(usuarioLimpio, password).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.success) {
          this.mensajeError = response.message || 'No fue posible iniciar sesión.';
          return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(response.data?.usuario.debeCambiarPassword
          ? '/cambiar-contrasena'
          : (returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/panel'));
      },
      error: (error: HttpErrorResponse) => {
        this.cargando = false;
        this.mensajeError = error.error?.message || 'No se pudo conectar con el servidor.';
      }
    });
  }

  private limpiarUsuario(usuario: string): string {
    return usuario
      .trim()
      .replace(/\s+/g, '');
  }

  private usuarioSeguroValidator(control: AbstractControl): ValidationErrors | null {
    const valor = String(control.value ?? '').trim();

    if (!valor) {
      return null;
    }

    /*
      Permitimos:
      - letras
      - números
      - punto
      - guion bajo
      - guion medio

      No permitimos:
      - espacios
      - comillas
      - punto y coma
      - símbolos usados comúnmente en inyección
    */
    const patronSeguro = /^[a-zA-Z0-9._-]+$/;

    if (!patronSeguro.test(valor)) {
      return {
        usuarioInseguro: true
      };
    }

    return null;
  }
}
