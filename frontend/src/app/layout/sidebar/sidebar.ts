import { Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Icon } from '../../shared/components/icon';
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: ` <aside [class.open]="open()">
    <a class="brand" routerLink="/dashboard"
      ><div class="seal"><app-icon name="building" /></div>
      <div>
        <strong>UMSS</strong><small>UNIVERSIDAD MAYOR<br />DE SAN SIMÓN</small>
      </div></a
    >
    <div class="division">
      <span>DTIC</span>
      <p>Sistema de Informes Técnicos</p>
    </div>
    <div class="nav-label">MENÚ PRINCIPAL</div>
    <nav>
      @for (item of links; track item.path) {
        @if (!item.admin || auth.isAdmin()) {
          <a [routerLink]="item.path" routerLinkActive="active" (click)="close.emit()"
            ><app-icon [name]="item.icon" /><span>{{ item.label }}</span></a
          >
        }
      }
    </nav>
    <div class="sidebar-foot">
      <span class="local-dot"></span> Entorno local
      <div>Gestión documental institucional<br />Cochabamba · Bolivia</div>
    </div>
  </aside>`,
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  auth = inject(AuthService);
  open = input(false);
  close = output();
  links = [
    { path: '/dashboard', label: 'Inicio', icon: 'home' },
    { path: '/informes', label: 'Informes técnicos', icon: 'file' },
    { path: '/materiales', label: 'Catálogo de materiales', icon: 'box' },
    { path: '/plantillas', label: 'Plantillas', icon: 'template' },
    { path: '/usuarios', label: 'Usuarios', icon: 'users', admin: true },
  ];
}
