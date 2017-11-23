const actors = require('comedy')

const { TantalusLogger } = require('../utils/tantalusLogger')
const TraderConfigsGenerator = require('./traderConfigsGenerator')

const defaultWorkerModule = '/backend/simrun/partitionWorker'

const createWorkerConfigs = (logger, executorConfig) => {
  const traderConfigsGen = TraderConfigsGenerator()
    .createGenerator(executorConfig.generatorConfig)
  const totalConfigsCount = traderConfigsGen.length
  const workerCount = Math.min(totalConfigsCount, executorConfig.partitionWorkerCount)

  logger.info(`distributing ${totalConfigsCount} trader configs to ${workerCount} workers`)
  const configSliceLen = totalConfigsCount / workerCount

  return Array.from({ length: workerCount }, (_, ix) => {
    const configsStartIx = Math.round(ix * configSliceLen)
    const projectedEndIx = Math.round((ix + 1) * configSliceLen) - 1
    const configsEndIx = Math.min(projectedEndIx, totalConfigsCount - 1)
    return {
      configsStartIx,
      configsEndIx,
      generatorConfig: executorConfig.generatorConfig
    }
  })
}

const PartitionExecutor = (baseLogger, workersModule = defaultWorkerModule) => {
  const logger = TantalusLogger(baseLogger, 'EXEC')

  const data = {
    actorSystem: null,
    workers: []
  }

  const init = () => {
    data.actorSystem = actors()
    data.actorSystem.getLog().setLevel(3)
  }

  const shutdown = () => data.actorSystem ? data.actorSystem.destroy() : Promise.resolve()

  const configureWorkers = executorConfig => {
    return destroyExistingWorkers()
      .then(() => data.actorSystem.rootActor())
      .then(rootActor => {
        const workerConfigs = createWorkerConfigs(logger, executorConfig)
        return Promise.all(workerConfigs.map(createWorker(rootActor)))
      })
      .then(workers => { data.workers = workers })
  }

  const createWorker = (rootActor) => config => {
    return rootActor.createChild(workersModule, { mode: 'forked' })
      .then(worker => worker
        .sendAndReceive('createTraders', config)
        .then(() => worker)
      )
  }

  const destroyExistingWorkers = () => Promise
    .all(data.workers.map(worker => worker.destroy()))
    .then(() => { data.workers = [] })

  const drainTransactions = slice => Promise
    .all(data.workers.map(worker => worker.sendAndReceive('drainTransactions', slice)))

  const getAllAccountsSorted = () => Promise
    .all(data.workers.map(worker => worker.sendAndReceive('getAccounts')))
    .then(allAccounts => [].concat(...allAccounts)
      .sort((accA, accB) => accB.fullValue - accA.fullValue)
    )

  return {
    init,
    configureWorkers,
    shutdown,
    drainTransactions,
    getAllAccountsSorted
  }
}

module.exports = PartitionExecutor
