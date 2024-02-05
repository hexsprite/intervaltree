const jestConsole = console
import originalConsole from 'console'

// I personally dislike how jest overrides the console output and adds a trace
beforeEach(() => {
  global.console = originalConsole
})

afterEach(() => {
  global.console = jestConsole
})
