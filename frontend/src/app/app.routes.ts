import { Routes } from '@angular/router';
import { authenticatedGuard } from './core/auth/guards/authenticated.guard';
import { masterGuard } from './core/auth/guards/master.guard';

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
  {
    path: 'codice',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./features/codice/entry-list/entry-list').then((m) => m.EntryList),
  },
  {
    path: 'codice/:id',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./features/codice/entry-detail/entry-detail').then((m) => m.EntryDetail),
  },
  {
    path: 'personajes/crear',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./features/personajes/crear-personaje/crear-personaje').then(
        (m) => m.CrearPersonaje,
      ),
  },
  {
    path: 'master/tipos',
    canActivate: [authenticatedGuard, masterGuard],
    loadComponent: () =>
      import('./features/master/tipos-admin/tipos-admin').then((m) => m.TiposAdmin),
  },
  {
    path: 'master/entries',
    canActivate: [authenticatedGuard, masterGuard],
    loadComponent: () =>
      import('./features/master/entries-admin/entries-admin').then((m) => m.EntriesAdmin),
  },
];
