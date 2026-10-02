export interface Auth0Environment {
  domain: string;
  clientId: string;
  audience: string;
}

export interface Environment {
  production: boolean;
  apiUrl: string;
  auth0: Auth0Environment;
}
