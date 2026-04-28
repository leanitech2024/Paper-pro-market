export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ILogger {
  debug(msg: string, ...args: any[]): void;
  info(msg: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  debug(obj: object, msg?: string, ...args: any[]): void;
  info(obj: object, msg?: string, ...args: any[]): void;
  warn(obj: object, msg?: string, ...args: any[]): void;
  error(obj: object, msg?: string, ...args: any[]): void;
}

class ClientLogger implements ILogger {
  debug(arg1: any, arg2?: any, ...args: any[]) {
    if (typeof arg1 === 'string') console.debug(arg1, arg2, ...args);
    else console.debug(arg2 || '', arg1, ...args);
  }
  info(arg1: any, arg2?: any, ...args: any[]) {
    if (typeof arg1 === 'string') console.info(arg1, arg2, ...args);
    else console.info(arg2 || '', arg1, ...args);
  }
  warn(arg1: any, arg2?: any, ...args: any[]) {
    if (typeof arg1 === 'string') console.warn(arg1, arg2, ...args);
    else console.warn(arg2 || '', arg1, ...args);
  }
  error(arg1: any, arg2?: any, ...args: any[]) {
    if (typeof arg1 === 'string') console.error(arg1, arg2, ...args);
    else console.error(arg2 || '', arg1, ...args);
  }
}

export const clientLogger: ILogger = new ClientLogger();
