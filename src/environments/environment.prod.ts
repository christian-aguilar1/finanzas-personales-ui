import {Environment} from './environment.model';

// Inyectado en runtime por /api/env.js (función serverless de Vercel). Ese archivo
// no es un asset de Angular, así que en `ng serve` responde 404 y este bloque queda
// en undefined: en desarrollo manda environment.ts.
const runtimeEnv = (window as any).__env as
  | {
      apiUrl?: string;
      auth0Domain?: string;
      auth0ClientId?: string;
      auth0Audience?: string;
    }
  | undefined;

export const environment: Environment = {
  production: true,
  apiUrl: runtimeEnv?.apiUrl as string,
  auth0: {
    domain: runtimeEnv?.auth0Domain as string,
    clientId: runtimeEnv?.auth0ClientId as string,
    audience: runtimeEnv?.auth0Audience as string
  }
};
