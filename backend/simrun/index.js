const mongo = require('../utils/mongoConnection')

const { TantalusLogger, redText } = require('../utils/tantalusLogger')
const { executorConfig, initialGeneratorRanges, genAlgoConfig } = require('./simrunConfig')
const SimRunner = require('./simRunner')
const SimReporter = require('./simReporter')

const PartitionExecutor = require('./partitionExecutor')
const TransactionRepo = require('../transactions/transactionsRepo')
const TransactionsSource = require('./transactionsSource')

const TraderConfigGenerator = require('./configsgen/traderConfigGenerator')
const TraderConfigPermutator = require('./configsgen/traderConfigPermutator')

const baseLogger = console
const simLogger = TantalusLogger(baseLogger, 'SimMain', redText)

const initialGeneratedConfigs = () => {
  return TraderConfigGenerator()
    .createGenerator(initialGeneratorRanges)
    .toArray()
}

const createDatabaseDependents = () => mongo.initializeDirectConnection(executorConfig, simLogger)
  .then(() => {
    const reporter = SimReporter(baseLogger, executorConfig)
    const transactionsSource = TransactionsSource(baseLogger, TransactionRepo())
    return transactionsSource.reset(executorConfig.batchSeconds)
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

const runSimulation = (simulationId, reporter, transactionsSource, partitionExecutor, initialTraderConfigs) => {
  const simRunner = SimRunner(baseLogger, transactionsSource, partitionExecutor)
  const permutator = TraderConfigPermutator(baseLogger, genAlgoConfig)

  const runIteration = traderConfigs => {
    const startTime = process.hrtime()

    return transactionsSource.reset(executorConfig.batchSeconds)
      .then(() => simRunner.run(executorConfig, traderConfigs, permutator.progressString()))
      .then(partitionExecutor.getAllAccounts)
      .then(allAccounts =>
        reporter.storeSimulationResults(
          simulationId, startTime, process.hrtime(),
          transactionsSource, allAccounts,
          traderConfigs.length, permutator.currentIteration()
        ).then(() => permutator.hasNext()
          ? runIteration(permutator.nextGeneration(allAccounts, traderConfigs))
          : Promise.resolve())
      )
      .catch(errorHandler('Run simulation: ', true))
  }

  return runIteration(initialTraderConfigs)
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

const simulation = simulationId => Promise.all([
  startupPartitionExecutor(),
  initialGeneratedConfigs(),
  createDatabaseDependents()
]).then(([_, traderConfigs, dbworker]) => {
  const transactionsSource = dbworker.transactionsSource
  const reporter = dbworker.reporter
  return runSimulation(simulationId, reporter, transactionsSource, partitionExecutor, traderConfigs)
}).catch(errorHandler('Setup simulation: ', true))
  .then(shutdownPartitionExecutor)
  .then(shutdown)

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', errorHandler('uncaught exception: ', true))

const simulationId = process.argv[2]
if (simulationId !== undefined) {
  simLogger.info(`Simulation ID: ${simulationId}`)
  simulation(simulationId)
} else {
  simLogger.error('Simulation ID not set')
  simLogger.error('Usage:  npm run simrun <simulationId>')
}
