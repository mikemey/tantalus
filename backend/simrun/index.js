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
  batchSeconds: 3600,
  transactionsUpdateSeconds: 10
}

const configGenConfig = {
  timeslotSeconds: { start: 50, end: 100, step: 50 },
  buying: {
    ratio: { start: 0.5, end: 0.5, step: 0.5 },
    useTimeslots: { start: 2, end: 2, step: 1 }
  },
  selling: {
    ratio: { start: 0, end: 0, step: 0.5 },
    useTimeslots: { start: 2, end: 2, step: 1 }
  }
}

const tradingConfig = {
  buying: {
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    lowerLimit_mmBtc: 80
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
  .resolve(TraderConfigsGenerator().generate(configGenConfig, tradingConfig))

const runSimulation = (transactionsSource, traderConfigs) => {
  return SimRunner(baseLogger, transactionsSource, traderConfigs, simrunConfig.transactionsUpdateSeconds)
    .run()
    .catch(errorHandler('Run simulation: ', true))
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
  createTransactionsSource(),
  generateTraderConfigs()
]).then(([transactionsSource, traderConfigs]) =>
  runSimulation(transactionsSource, traderConfigs)
  )
  .catch(errorHandler('Setup simulation: ', true))
  .then(shutdown)
