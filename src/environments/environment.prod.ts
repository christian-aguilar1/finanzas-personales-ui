import {Environment} from './environment.model';

export const environment: Environment = {
  production: true,
  apiUrl: (window as any)['NG_APP_API_URL']
};
