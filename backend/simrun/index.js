const mongo = require('../utils/mongoConnection')

const { TantalusLogger, redText } = require('../utils/tantalusLogger')
const PartitionExecutor = require('./partitionExecutor')
const TransactionRepo = require('../transactions/transactionsRepo')
const TransactionsSource = require('./transactionsSource')

const SimRunner = require('./simRunner')

const commonTraderConfig = {
  buying: {
    volumeLimitPence: 100000,
    lowerLimitPence: 5000
  },
  selling: {
    lowerLimit_mmBtc: 80
  }
}

const generatorConfig = {
  timeslotSeconds: { start: 50, end: 150, step: 50 },
  buying: {
    ratio: { start: 1, end: 1.5, step: 0.5 },
    useTimeslots: { start: 2, end: 2, step: 1 }
  },
  selling: {
    ratio: { start: -0.1, end: -0.1, step: 0.5 },
    useTimeslots: { start: 2, end: 2, step: 1 }
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
  batchSeconds: 100,
  transactionsUpdateSeconds: 10,
  partitionWorkerCount: 3,
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

const createPartitionExecutor = config => PartitionExecutor(config)

const runSimulation = (transactionsSource, partitionExecutor, config) => {
  return SimRunner(baseLogger, transactionsSource, partitionExecutor, config.transactionsUpdateSeconds)
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
  createTransactionsSource(executorConfig),
  createPartitionExecutor(executorConfig)
]).then(([transactionsSource, partitionExecutor]) =>
  runSimulation(transactionsSource, partitionExecutor, executorConfig)
  )
  .catch(errorHandler('Setup simulation: ', true))
  .then(shutdown)
