const mongo = require('../utils/mongoConnection')

const { TantalusLogger, redText } = require('../utils/tantalusLogger')
const TraderConfigsGenerator = require('./traderConfigsGenerator')
const TransactionRepo = require('../transactions/transactionsRepo')
const TransactionsSource = require('./transactionsSource')

const SimRunner = require('./simRunner')

const simrunConfig = {
  mongodb: {
    url: 'mongodb://127.0.0.1:27017/tantalus'
  },
  batchSeconds: 3600 * 12
}

const configGenConfig = {
  timeslotSeconds: { start: 10, end: 120, step: 50 },
  buying: {
    ratio: { start: 2, end: 3, step: 0.5 },
    useTimeslots: { start: 2, end: 5, step: 1 }
  },
  selling: {
    ratio: { start: -2, end: 0, step: 0.5 },
    useTimeslots: { start: 2, end: 5, step: 1 }
  }
}

// const tooLarge = {
//   timeslotSeconds: { start: 10, end: 820, step: 40 },
//   buying: {
//     ratio: { start: 2, end: 12, step: 0.5 },
//     useTimeslots: { start: 2, end: 10, step: 1 }
//   },
//   selling: {
//     ratio: { start: -5, end: 0, step: 0.5 },
//     useTimeslots: { start: 2, end: 8, step: 1 }
//   }
// }

const baseLogger = console
const simLogger = TantalusLogger(baseLogger, 'SimMain', redText)

const createTransactionsSource = () => mongo.initializeDirectConnection(simrunConfig, simLogger)
  .then(() => {
    const transactionsSource = TransactionsSource(baseLogger, TransactionRepo())
    return transactionsSource.init(simrunConfig.batchSeconds)
      .then(() => transactionsSource)
  })

const generateTraderConfigs = () => Promise
  .resolve(TraderConfigsGenerator().generate(configGenConfig))

const runSimulation = (transactionsSource, traderConfigs) => {
  return SimRunner(baseLogger, transactionsSource, traderConfigs)
    .run()
    .catch(errorHandler('Run simulation: ', true))
}

const logPromiseTime = (name, promiseFunc) => {
  simLogger.info('start timing')
  console.time(name)
  return promiseFunc()
    .then(result => {
      console.timeEnd(name)
      return result
    })
}

const shutdown = () => {
  simLogger.info('quit')
  process.exit(0)
}

const errorHandler = (prefix, stop) => err => {
  simLogger.error(prefix + err.message)
  simLogger.log(err)
  if (err.cause !== undefined) errorHandler('<=== CAUSED BY: ', false)(err.cause)
  if (stop) shutdown()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', errorHandler('uncaught exception: ', true))

Promise.all([
  logPromiseTime('TXSource', createTransactionsSource),
  logPromiseTime('CFGgen', generateTraderConfigs)
]).then(([transactionsSource, traderConfigs]) =>
  logPromiseTime('SimRun', runSimulation.bind(null, transactionsSource, traderConfigs))
  )
  .catch(errorHandler('Setup simulation: ', true))
  .then(shutdown)
