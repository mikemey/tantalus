const mongo = require('../utils/mongoConnection')

const { TantalusLogger, redText } = require('../utils/tantalusLogger')
const PartitionExecutor = require('./partitionExecutor')
const TransactionRepo = require('../transactions/transactionsRepo')
const TransactionsSource = require('./transactionsSource')
const TraderConfigsGenerator = require('./traderConfigsGenerator')

const { executorConfig, generatorConfig } = require('./simrunConfig')
const SimRunner = require('./simRunner')
const SimReporter = require('./simReporter')

const baseLogger = console
const simLogger = TantalusLogger(baseLogger, 'SimMain', redText)

const initialGeneratedConfigs = generatorConfig => {
  return TraderConfigsGenerator()
    .createGenerator(generatorConfig)
    .toArray()
}

const createDatabaseDependents = config => mongo.initializeDirectConnection(config, simLogger)
  .then(() => {
    const reporter = SimReporter(config)
    const transactionsSource = TransactionsSource(baseLogger, TransactionRepo())
    return transactionsSource.reset(config.batchSeconds)
      .then(() => {
        return { transactionsSource, reporter }
      })
  })

let partitionExecutor

const startupPartitionExecutor = () => {
  partitionExecutor = PartitionExecutor(baseLogger)
  partitionExecutor.init()
}

const shutdownPartitionExecutor = () => {
  if (partitionExecutor) return partitionExecutor.shutdown()
}

const startTime = process.hrtime()

const runSimulation = (reporter, transactionsSource, partitionExecutor, executorConfig, traderConfigs) => {
  return SimRunner(baseLogger, transactionsSource, partitionExecutor)
    .run(executorConfig, traderConfigs)
    .then(() => reporter
      .storeSimulationResults(startTime, process.hrtime(), transactionsSource, partitionExecutor, traderConfigs.length)
    )
    .catch(errorHandler('Run simulation: ', true))
}

const shutdown = () => {
  baseLogger.info()
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
  startupPartitionExecutor(),
  initialGeneratedConfigs(generatorConfig),
  createDatabaseDependents(executorConfig)
]).then(([_, traderConfigs, dbworker]) => {
  const transactionsSource = dbworker.transactionsSource
  const reporter = dbworker.reporter
  return runSimulation(reporter, transactionsSource, partitionExecutor, executorConfig, traderConfigs)
})
  .catch(errorHandler('Setup simulation: ', true))
  .then(shutdownPartitionExecutor)
  .then(shutdown)
