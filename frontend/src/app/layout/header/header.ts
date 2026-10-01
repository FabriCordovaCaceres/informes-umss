import { Component, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Icon } from '../../shared/components/icon';
@Component({
  selector: 'app-header',
  imports: [Icon, RouterLink],
  template: `<header>
    <button class="icon-button mobile-toggle" aria-label="Abrir menú" (click)="menu.emit()">
      <app-icon name="menu" />
    </button>
    <div class="header-label">DIRECCIÓN DE TECNOLOGÍAS DE INFORMACIÓN Y COMUNICACIÓN</div>
    <div class="account">
      <div class="avatar">{{ auth.user()?.nombre?.slice(0, 1) || 'U' }}</div>
      <div>
        <strong>{{ auth.user()?.nombre }}</strong
        ><small>{{ auth.user()?.rol }}</small>
      </div>
      <a routerLink="/cambiar-contrasena" class="account-link">Cambiar contraseña</a>
      <button
        class="icon-button"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        (click)="auth.logout()"
      >
        <app-icon name="logout" />
      </button>
    </div>
  </header>`,
  styles: [
    `
      header {
        height: 82px;
        background: #fff;
        border-bottom: 1px solid #e2e7ed;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 38px;
        gap: 18px;
      }
      .header-label {
        font-size: 9px;
        letter-spacing: 1px;
        color: #69778b;
      }
      .account {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .account strong {
        display: block;
        font-size: 11px;
      }
      .account small {
        font-size: 9px;
        color: #8190a2;
        letter-spacing: 0.7px;
      }
      .account-link {
        font-size: 11px;
        color: #284b72;
        text-decoration: underline;
      }
      .avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #edf1f6;
        color: #27476a;
        display: grid;
        place-items: center;
      }
      .mobile-toggle {
        display: none;
      }
      @media (max-width: 1000px) {
        header {
          padding: 0 20px;
        }
        .mobile-toggle {
          display: flex;
        }
        .header-label {
          display: none;
        }
        .account {
          margin-left: auto;
        }
      }
    `,
  ],
})
export class Header {
  auth = inject(AuthService);
  menu = output();
}
