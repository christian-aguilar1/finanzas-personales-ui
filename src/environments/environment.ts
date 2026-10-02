import {Environment} from './environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  auth0: {
    domain: 'dev-phwap6gl.us.auth0.com',
    clientId: 'zA5KBTEfq8C79jbEiLiJnVoTDBeqQEiu',
    audience: 'https://finanzas-personales-api'
  }
};
