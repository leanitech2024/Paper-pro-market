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

class DefaultLogger implements ILogger {
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

let activeLogger: ILogger = new DefaultLogger();

export const setLogger = (logger: ILogger) => {
  activeLogger = logger;
};

export const logger: ILogger = {
  debug: (...args: any[]) => (activeLogger.debug as any)(...args),
  info: (...args: any[]) => (activeLogger.info as any)(...args),
  warn: (...args: any[]) => (activeLogger.warn as any)(...args),
  error: (...args: any[]) => (activeLogger.error as any)(...args),
};
