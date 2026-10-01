import { Routes } from '@angular/router';
import {
  authGuard,
  passwordChangeGuard,
  adminGuard,
  writerGuard,
  unsavedGuard,
} from './core/guards/auth.guard';
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login').then((m) => m.Login) },
  {
    path: 'cambiar-contrasena',
    canActivate: [passwordChangeGuard],
    loadComponent: () => import('./features/auth/password-change').then((m) => m.PasswordChange),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'informes',
        data: { list: true },
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'informes/nuevo',
        canActivate: [writerGuard],
        canDeactivate: [unsavedGuard],
        loadComponent: () =>
          import('./features/informes/informe-editor').then((m) => m.InformeEditor),
      },
      {
        path: 'informes/:id/editar',
        canActivate: [writerGuard],
        canDeactivate: [unsavedGuard],
        loadComponent: () =>
          import('./features/informes/informe-editor').then((m) => m.InformeEditor),
      },
      {
        path: 'informes/:id',
        loadComponent: () => import('./features/informes/informe-view').then((m) => m.InformeView),
      },
      {
        path: 'materiales',
        loadComponent: () => import('./features/materiales/materiales').then((m) => m.Materiales),
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/usuarios/usuarios').then((m) => m.Usuarios),
      },
      {
        path: 'plantillas',
        loadComponent: () => import('./features/plantillas/plantillas').then((m) => m.Plantillas),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
