export let enableDebug = 0

export function debug(...args: any[]) {
  // works like console.log however if the first arg is a function then it is
  // called and its return value is applied to the console.log() command
  // this allows the deferral of expensive logging
  if (enableDebug) {
    let consoleArgs = args
    if (args.length === 1 && typeof args[0] === 'function') {
      consoleArgs = [args[0]()]
    }
    if (typeof logger !== 'undefined') {
      logger.debug(...consoleArgs)
    } else {
      // tslint:disable-next-line no-console
      console.log(...consoleArgs)
    }
  }
}
