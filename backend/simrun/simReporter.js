const mongo = require('../utils/mongoConnection')

const SimRepo = () => {
  const simulationReportsCollection = () => mongo.db.collection(mongo.simulationReportsCollectionName)
  const traderReportsCollection = () => mongo.db.collection(mongo.traderReportsCollectionName)

  const storeSimulationReport = simReport => simulationReportsCollection().insertOne(simReport)
    .then(result => {
      if (result.insertedCount !== 1) throw Error('insert simulation failed: ' + result.message)
    })

  const storeTraderReports = traderReports =>
    traderReportsCollection().bulkWrite(storeTraderReportOps(traderReports))

  const storeTraderReportOps = traderReports => traderReports.map(traderReport => {
    return {
      updateOne: {
        filter: { clientId: traderReport.clientId },
        update: {
          $push: { runs: traderReport.run }
        },
        upsert: true
      }
    }
  })

  return {
    storeSimulationReport,
    storeTraderReports
  }
}

const checkConfig = config => {
  if (!config.version) throwError('version')
  if (!config.batchSeconds) throwError('batchSeconds')
  if (!config.startInvestment) throwError('startInvestment')
  if (!config.partitionWorkerCount) throwError('partitionWorkerCount')
}

const throwError = name => {
  throw Error(`${name} not configured!`)
}

const SimReporter = (simConfig) => {
  checkConfig(simConfig)
  const simrepo = SimRepo()

  const storeSimulationResults = (startHrtime, endHrtime, transactionSource, partitionExecutor, traderCount) => {
    const simReport = createSimReport(startHrtime, endHrtime, transactionSource, traderCount)
    return simrepo.storeSimulationReport(simReport)
      .then(() => createTraderReports(simReport, partitionExecutor))
      .then(simrepo.storeTraderReports)
      .then(() => simReport)
  }

  const createSimReport = (startHrtime, endHrtime, transactionSource, traderCount) => {
    const startPrice = transactionSource.getStartPrice()
    const endPrice = transactionSource.getEndPrice()
    const staticInvestment = Math.round(simConfig.startInvestment / startPrice * endPrice)
    const startInvestment = simConfig.startInvestment
    return {
      version: simConfig.version,
      startDate: startHrtime[0],
      endDate: endHrtime[0],
      workerCount: simConfig.partitionWorkerCount,
      traderCount: traderCount,
      staticInvestment,
      startInvestment,
      transactions: {
        count: transactionSource.transactionCount(),
        startDate: transactionSource.getStartDate(),
        endDate: transactionSource.getEndDate(),
        startPrice,
        endPrice
      },
      batches: {
        count: transactionSource.batchCount(),
        duration: simConfig.batchSeconds
      }
    }
  }

  const createTraderReports = (simReport, partitionExecutor) => {
    return partitionExecutor.getAllAccounts()
      .then(accounts => accounts.map(account => {
        const investDiff = account.fullVolume - simReport.staticInvestment
        const absoluteDiff = account.fullVolume - simReport.startInvestment

        return {
          clientId: account.clientId,
          run: {
            simrunid: simReport._id,
            startDate: simReport.startDate,
            version: simConfig.version,
            amount: account.amount,
            volume: account.volume,
            fullVolume: account.fullVolume,
            investDiff,
            absoluteDiff
          }
        }
      }))
  }

  return { storeSimulationResults }
}

module.exports = SimReporter
