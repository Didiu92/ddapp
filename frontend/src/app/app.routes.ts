import { Routes } from '@angular/router';
import { authenticatedGuard } from './core/auth/guards/authenticated.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
];
