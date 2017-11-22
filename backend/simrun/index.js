const mongo = require('../utils/mongoConnection')

const { TantalusLogger, redText } = require('../utils/tantalusLogger')
const PartitionExecutor = require('./partitionExecutor')
const TransactionRepo = require('../transactions/transactionsRepo')
const TransactionsSource = require('./transactionsSource')

const SimRunner = require('./simRunner')
const executorConfig = require('./simrunConfig')

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
  return SimRunner(baseLogger, config, transactionsSource, partitionExecutor)
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
