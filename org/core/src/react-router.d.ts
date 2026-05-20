// React Router v7 type extensions for AppLoadContext
import 'react-router';

declare module 'react-router' {
  interface AppLoadContext {
    get<T>(key: symbol): T | undefined;
    set<T>(key: symbol, value: T): void;
  }
}
