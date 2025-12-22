import {Environment} from './environment.model';

export const environment: Environment = {
  production: true,
  apiUrl: (window as any).__env?.apiUrl
};
