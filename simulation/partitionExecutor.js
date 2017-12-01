const actors = require('comedy')

const { TantalusLogger } = require('../utils/tantalusLogger')

const defaultWorkerModule = '/simulation/txtrader/partitionWorker'

const PartitionExecutor = (baseLogger, workersModule = defaultWorkerModule) => {
  const logger = TantalusLogger(baseLogger, 'Exec')

  const data = {
    actorSystem: null,
    workers: []
  }

  const init = () => {
    data.actorSystem = actors()
    data.actorSystem.getLog().setLevel(3)
  }

  const shutdown = () => data.actorSystem ? data.actorSystem.destroy() : Promise.resolve()

  const configureWorkers = (executorConfig, allTraderConfigs) => {
    return destroyExistingWorkers()
      .then(() => data.actorSystem.rootActor())
      .then(rootActor => {
        const workerConfigObjects = splitTraderConfigs(allTraderConfigs, executorConfig.partitionWorkerCount)
        return Promise.all(workerConfigObjects.map(createWorker(rootActor)))
      })
      .then(workers => {
        logger.info(`created ${workers.length} workers`)
        data.workers = workers
      })
  }

  const splitTraderConfigs = (traderConfigs, configuredWorkerCount) => {
    const totalConfigsCount = traderConfigs.length
    const workerCount = Math.min(totalConfigsCount, configuredWorkerCount)

    logger.info(`distributing ${totalConfigsCount} trader configs to ${workerCount} workers`)
    const configSliceLen = totalConfigsCount / workerCount

    return Array.from({ length: workerCount }, (_, ix) => {
      const startIx = Math.round(ix * configSliceLen)
      const endIx = Math.round((ix + 1) * configSliceLen)
      return { traderConfigs: traderConfigs.slice(startIx, endIx) }
    })
  }

  const createWorker = (rootActor) => workerConfigObject => {
    return rootActor.createChild(workersModule, { mode: 'forked' })
      .then(worker => worker
        .sendAndReceive('createTraders', workerConfigObject)
        .then(() => worker)
      )
  }

  const destroyExistingWorkers = () => Promise
    .all(data.workers.map(worker => worker.destroy()))
    .then(() => { data.workers = [] })

  const runIteration = iterationProgress => Promise
    .all(data.workers.map(worker => worker.sendAndReceive('runIteration', iterationProgress)))

  const getAllAccounts = () => Promise
    .all(data.workers.map(worker => worker.sendAndReceive('getAccounts')))
    .then(allAccounts => [].concat(...allAccounts))

  return {
    init,
    configureWorkers,
    shutdown,
    runIteration,
    getAllAccounts
  }
}

module.exports = PartitionExecutor
