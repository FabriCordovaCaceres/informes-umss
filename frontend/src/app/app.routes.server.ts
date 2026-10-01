import { RenderMode, ServerRoute } from '@angular/ssr';
// Login is server-rendered. Authenticated screens use the browser's session token.
// Rendering those screens on the server would require a cookie-based session.
export const serverRoutes: ServerRoute[] = [
  { path: 'login', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
