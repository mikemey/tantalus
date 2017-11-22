const actors = require('comedy')

const { TantalusLogger } = require('../utils/tantalusLogger')
const TraderConfigsGenerator = require('./traderConfigsGenerator')

const defaultWorkerModule = '/backend/simrun/partitionWorker'

const PartitionExecutor = (executorConfig, baseLogger, workersModule = defaultWorkerModule) => {
  const logger = TantalusLogger(baseLogger, 'EXEC')

  const createWorkerConfigs = executorConfig => {
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

  const workerConfigs = createWorkerConfigs(executorConfig)
  let actorSystem, workers

  const startWorkers = () => {
    actorSystem = actors()
    actorSystem.getLog().setLevel(3)
    return actorSystem.rootActor()
      .then(rootActor => Promise.all(workerConfigs.map(workerConfig => rootActor
        .createChild(workersModule, { mode: 'forked' })
        .then(worker => worker
          .sendAndReceive('createTraders', baseLogger, workerConfig)
          .then(() => worker))
      )))
      .then(createdWorkers => { workers = createdWorkers })
  }

  const drainTransactions = slice => Promise.all(workers
    .map(worker => worker.sendAndReceive('drainTransactions', slice))
  )

  const getAllAccountsSorted = () => Promise.all(workers
    .map(worker => worker.sendAndReceive('getAccounts'))
  ).then(allAccounts => [].concat(...allAccounts)
    .sort((accA, accB) => accB.fullValue - accA.fullValue)
    )

  const stopWorkers = () => actorSystem ? actorSystem.destroy() : Promise.resolve()

  return {
    startWorkers,
    stopWorkers,
    drainTransactions,
    getAllAccountsSorted
  }
}

module.exports = PartitionExecutor
