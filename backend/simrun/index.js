const mongo = require('../utils/mongoConnection')

const { TantalusLogger, redText } = require('../utils/tantalusLogger')
const PartitionExecutor = require('./partitionExecutor')
const TransactionRepo = require('../transactions/transactionsRepo')
const TransactionsSource = require('./transactionsSource')

const SimRunner = require('./simRunner')

const commonTraderConfig = {
  syncedMode: true,
  buying: {
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    lowerLimit_mmBtc: 80
  }
}

const generatorConfig = {
  timeslotSeconds: { start: 50, end: 60, step: 50 },
  buying: {
    ratio: { start: 2, end: 4.5, step: 0.5 },
    useTimeslots: { start: 2, end: 5, step: 1 }
  },
  selling: {
    ratio: { start: -5, end: 0.5, step: 0.5 },
    useTimeslots: { start: 2, end: 5, step: 1 }
  },
  commonTraderConfig
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

const executorConfig = {
  mongodb: {
    url: 'mongodb://127.0.0.1:27017/tantalus'
  },
  batchSeconds: 3600 * 4,
  transactionsUpdateSeconds: 10,
  partitionWorkerCount: 5,
  generatorConfig
}

const baseLogger = console
const simLogger = TantalusLogger(baseLogger, 'SimMain', redText)

const createTransactionsSource = config => mongo.initializeDirectConnection(config, simLogger)
  .then(() => {
    const transactionsSource = TransactionsSource(baseLogger, TransactionRepo())
    return transactionsSource.init(config.batchSeconds)
      .then(() => transactionsSource)
  })

let partitionExecutor

const startupPartitionExecutor = config => {
  partitionExecutor = PartitionExecutor(config, baseLogger)
  return partitionExecutor.startWorkers()
}

const shutdownPartitionExecutor = () => {
  if (partitionExecutor) return partitionExecutor.stopWorkers()
}

const runSimulation = (transactionsSource, partitionExecutor, config) => {
  return SimRunner(baseLogger, transactionsSource, partitionExecutor, config.transactionsUpdateSeconds)
    .run()
    .catch(errorHandler('Run simulation: ', true))
}

const startTime = process.hrtime()

const shutdown = () => {
  baseLogger.info()
  simLogger.info(`total runtime: ${process.hrtime(startTime)[0]}s`)
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
  createTransactionsSource(executorConfig),
  startupPartitionExecutor(executorConfig)
]).then(([transactionsSource, _]) =>
  runSimulation(transactionsSource, partitionExecutor, executorConfig)
  )
  .catch(errorHandler('Setup simulation: ', true))
  .then(shutdownPartitionExecutor)
  .then(shutdown)
