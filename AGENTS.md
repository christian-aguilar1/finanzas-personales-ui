# AGENTS.md

## Commands

- `npx ng serve` — dev server at http://localhost:4200/ (proxies nothing; API is called cross-origin via `environment.apiUrl`, which the backend's CORS allowlist already covers)
- `npx ng build` — **defaults to the `production` configuration**; output goes to `dist/themis-ui` (legacy name, not the project name)
- `npx ng test --browsers ChromeHeadless --watch=false` — single run, no browser (106 specs, ~2s). `npx ng test` alone watches and needs a real Chrome.

No ESLint and no typecheck script: `ng build` is the typecheck (`strict`, `strictTemplates`, `noPropertyAccessFromIndexSignature` are all on — no dot access on index signatures). Prettier is configured in `package.json` (`singleQuote`, `printWidth: 100`, Angular HTML parser) but is **not** an installed dependency, so `npx prettier` downloads it on demand.

`anyComponentStyle` budget is 4kB warning / **8kB error**; `proyeccion.css` (4.12 kB), `cuadre.css` (5.47 kB) and `transacciones.css` (4.44 kB) already exceed the warning. Crossing 8kB fails the build.

The initial bundle is ~1.31 MB against a 1.10 MB warning budget (a warning only; `ng build` still succeeds).

## Architecture

Angular 20 standalone components, no NgModules, no lazy loading. All routes eagerly imported in `app.routes.ts`.

**Locale:** Spanish (`LOCALE_ID` in `app.config.ts`, locale data in `main.ts`). All user-facing text is in Spanish.

**File naming:** files are `{name}.ts` (not `{name}.component.ts`) but classes are `{Name}Component` (`transacciones.ts` → `TransaccionesComponent`); `inicio`/`header`/`footer`/`app` drop the suffix. Each folder has `*.ts`, `*.html`, `*.css`, `*.spec.ts`.

**UI libraries are mixed — match the page you're editing:** PrimeNG (Lara theme via `providePrimeNG`) in `transaccion` and the app shell, Angular Material in `transacciones`, chart.js on a `<canvas>` in `presupuesto` and `proyeccion`. `@angular/cdk` is not used; Material icons come from the Google Fonts `<link>` in `index.html`.

**Forms:** reactive in `transaccion`, `cuentas`, `categorias`; template-driven (`FormsModule`/`ngModel`) in `transacciones`, `presupuesto`, `proyeccion`, `cuadre`.

**Services:** All `providedIn: 'root'`, REST calls via `HttpClient` to `environment.apiUrl`. Backend returns Spring HATEOAS format (`_embedded`, `page`).

**Auth:** Auth0 Universal Login via `@auth0/auth0-angular` (`provideAuth0` in `app.config.ts`). Routes are protected with `authGuardFn`; `/callback` is the redirect route and is deliberately unguarded. The API is on another origin and the backend deduces the user from the JWT, so **no service sends or reads a `userId`**. `unauthorizedInterceptorFn` only calls `loginWithRedirect()` on a 401 when `isAuthenticated$` is false (session genuinely gone); with a session it just propagates the error, because a 401 with a session means a config problem (wrong `aud`, API not enabled in the tenant's SPA), and redirecting would bounce the user Auth0 ↔ app forever.

## Environment

- Dev API: `http://localhost:8080/api` (`environments/environment.ts`)
- Prod API: `(window as any).__env?.apiUrl`, injected at runtime by `/api/env.js`, a Vercel serverless function reading the `API_URL` env var. That file is **not** in the Angular `assets` list, so `ng serve` 404s on it — harmless, dev uses `environment.ts`.

Auth0 settings follow the same split: dev in `environment.ts` (`auth0.domain`, `auth0.clientId`, `auth0.audience`), prod from `__env.auth0Domain` / `__env.auth0ClientId` / `__env.auth0Audience`, served by the same `api/env.js`. Dev values are filled in: domain `dev-phwap6gl.us.auth0.com`, audience `https://finanzas-personales-api` (must match the dev tenant's API Identifier exactly — no trailing slash; a mismatch 401s before the request reaches any service).

## Testing

Karma + Jasmine, no e2e. Most specs are smoke-level ("should create"); the meaningful ones are in `transacciones`, `proyeccion`, `cuadre`, `categorias`, `app.routes` and the four service specs. Services are mocked with `jasmine.createSpyObj` or `{provide: X, useValue: of(...)}` — specs that touch services must not hit the network. Service specs use `provideHttpClientTesting` + `HttpTestingController`.

Components whose templates use `routerLink` need `provideRouter([])` in the spec providers (or `provideRouter(routes)`); a bare `{ provide: Router, useValue: { navigate: ... } }` stub is not enough and fails with NG0201.

## State Management
- No hay librería externa de estado (ej. NgRx).
- Para persistencia de filtros entre navegación y refrescos de página, usar servicios dedicados (`providedIn: 'root'`) que interactúen con `localStorage`.
- Los servicios deben ser la única fuente de verdad para el estado de los filtros.

## Workflows
- **Filtros en Transacciones:** El filtrado y ordenamiento se realiza del lado del servidor (backend). Cualquier cambio en la UI debe disparar una recarga de datos llamando a `transaccionService.obtenerTransacciones` con los nuevos parámetros de filtro/sort.