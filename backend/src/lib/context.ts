import { AsyncLocalStorage } from 'async_hooks';

export const contextStorage = new AsyncLocalStorage<Map<string, any>>();

export const getRequestId = (): string | undefined => {
  const store = contextStorage.getStore();
  return store?.get('requestId');
};
