// eslint-disable-next-line prefer-const
export let enableDebug = process.env.IT_DEBUG === '1'

export function debug(...args: unknown[]) {
  logger.info(args.map(String).join(' '))
}

export class Logger {
  constructor(private context: Record<string, unknown> = {}) {}

  child(extraContext = {}) {
    return new Logger({ ...this.context, ...extraContext })
  }

  info(contextOrMessage, optionalMessage?) {
    if (this.context.silent) return
    if (typeof contextOrMessage === 'string') {
      console.log(contextOrMessage)
    } else {
      console.log(`${optionalMessage}: ${contextOrMessage}`)
    }
  }
}

export const logger = new Logger({ silent: !enableDebug })
