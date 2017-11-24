const mongo = require('../utils/mongoConnection')

const { TantalusLogger, redText } = require('../utils/tantalusLogger')
const PartitionExecutor = require('./partitionExecutor')
const TransactionRepo = require('../transactions/transactionsRepo')
const TransactionsSource = require('./transactionsSource')
const TraderConfigsGenerator = require('./traderConfigsGenerator')

const SimRunner = require('./simRunner')
const { executorConfig, generatorConfig } = require('./simrunConfig')

const baseLogger = console
const simLogger = TantalusLogger(baseLogger, 'SimMain', redText)

const initialGeneratedConfigs = generatorConfig => {
  return TraderConfigsGenerator()
    .createGenerator(generatorConfig)
    .toArray()
}

const createTransactionsSource = config => mongo.initializeDirectConnection(config, simLogger)
  .then(() => {
    const transactionsSource = TransactionsSource(baseLogger, TransactionRepo())
    return transactionsSource.reset(config.batchSeconds)
      .then(() => transactionsSource)
  })

let partitionExecutor

const startupPartitionExecutor = () => {
  partitionExecutor = PartitionExecutor(baseLogger)
  partitionExecutor.init()
}

const shutdownPartitionExecutor = () => {
  if (partitionExecutor) return partitionExecutor.shutdown()
}

const runSimulation = (transactionsSource, partitionExecutor, executorConfig, traderConfigs) => {
  return SimRunner(baseLogger, transactionsSource, partitionExecutor)
    .run(executorConfig, traderConfigs)
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
  initialGeneratedConfigs(generatorConfig),
  createTransactionsSource(executorConfig),
  startupPartitionExecutor()
]).then(([traderConfigs, transactionsSource, _]) =>
  runSimulation(transactionsSource, partitionExecutor, executorConfig, traderConfigs)
  )
  .catch(errorHandler('Setup simulation: ', true))
  .then(shutdownPartitionExecutor)
  .then(shutdown)
