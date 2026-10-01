import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { Header } from './header/header';
@Component({
  imports: [RouterOutlet, Sidebar, Header],
  template: `<app-sidebar [open]="menu()" (close)="menu.set(false)" />
    @if (menu()) {
      <button class="nav-backdrop" aria-label="Cerrar menú" (click)="menu.set(false)"></button>
    }
    <div class="workspace">
      <app-header (menu)="menu.set(!menu())" />
      <main><router-outlet /></main>
      <footer>
        © {{ year }} Universidad Mayor de San Simón <span>DTIC · Sistema de Informes Técnicos</span>
      </footer>
    </div>`,
  styles: [
    `
      .workspace {
        margin-left: 250px;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      main {
        padding: 36px 38px;
        flex: 1;
        min-width: 0;
      }
      footer {
        padding: 20px 38px;
        border-top: 1px solid #e2e7ed;
        font-size: 10px;
        color: #8490a0;
        display: flex;
        justify-content: space-between;
      }
      .nav-backdrop {
        display: none;
      }
      @media (max-width: 1000px) {
        .workspace {
          margin-left: 0;
        }
        main {
          padding: 24px 20px;
        }
        .nav-backdrop {
          display: block;
          position: fixed;
          inset: 0;
          background: #0005;
          z-index: 25;
        }
        footer {
          padding: 20px;
          gap: 10px;
        }
      }
    `,
  ],
})
export class Layout {
  menu = signal(false);
  year = new Date().getFullYear();
}
