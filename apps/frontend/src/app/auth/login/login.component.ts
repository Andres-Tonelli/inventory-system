import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  errorMsg: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    if (!this.username.trim()) {
      this.errorMsg = 'Por favor ingresa tu usuario de red.';
      return;
    }
    if (!this.password.trim()) {
      this.errorMsg = 'Por favor ingresa tu contraseña.';
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    this.authService.login(this.username, this.password).subscribe((res) => {
      this.loading = false;
      if (res.success) {
        // Redirigir a la pantalla principal (selector de dominio)
        this.router.navigate(['/']);
      } else {
        this.errorMsg = res.message || 'Usuario o contraseña incorrectos.';
      }
    });
  }
}
