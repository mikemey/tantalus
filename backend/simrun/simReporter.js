const mongo = require('../utils/mongoConnection')
const { TantalusLogger } = require('../utils/tantalusLogger')
const { amountString, priceString, volumeString } = require('../utils/ordersHelper')

const SimRepo = () => {
  const simulationReportsCollection = () => mongo.db.collection(mongo.simulationReportsCollectionName)
  const traderReportsCollection = () => mongo.db.collection(mongo.traderReportsCollectionName)

  const storeSimulationReport = simReport => simulationReportsCollection().insertOne(simReport)
    .then(result => {
      if (result.insertedCount !== 1) throw Error('insert simulation failed: ' + result.message)
    })

  const storeTraderReports = traderReports =>
    traderReportsCollection().bulkWrite(storeTraderReportOps(traderReports))
      .then(() => traderReports)

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
  if (!config.batchSeconds) throwError('batchSeconds')
  if (!config.startInvestment) throwError('startInvestment')
  if (!config.partitionWorkerCount) throwError('partitionWorkerCount')
  if (!config.rankingLimit) throwError('rankingLimit')
}

const throwError = name => {
  throw Error(`${name} not configured!`)
}

const SimReporter = (baseLogger, simConfig) => {
  checkConfig(simConfig)
  const logger = TantalusLogger(baseLogger, 'Report')
  const simrepo = SimRepo()

  const storeSimulationResults = (startHrtime, endHrtime, transactionSource, allAccounts, traderCount, iteration) => {
    const simReport = createSimReport(startHrtime, endHrtime, transactionSource, traderCount, iteration)

    return simrepo.storeSimulationReport(simReport)
      .then(() => {
        const traderReports = createTraderReports(simReport, allAccounts)
        return Promise.all([
          simrepo.storeTraderReports(traderReports),
          logSimulationResults(simReport, traderReports)
        ]).then(() => simReport)
      })
  }

  const createSimReport = (startHrtime, endHrtime, transactionSource, traderCount, iteration) => {
    const startPrice = transactionSource.getStartPrice()
    const endPrice = transactionSource.getEndPrice()
    const staticInvestment = Math.round(simConfig.startInvestment / startPrice * endPrice)
    const startInvestment = simConfig.startInvestment
    return {
      version: simConfig.version,
      iteration,
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

  const createTraderReports = (simReport, allAccounts) => {
    return allAccounts.map(account => {
      return {
        clientId: account.clientId,
        run: {
          simrunid: simReport._id,
          startDate: simReport.startDate,
          amount: account.amount,
          volume: account.volume,
          fullVolume: account.fullVolume,
          investDiff: account.fullVolume - simReport.staticInvestment,
          absoluteDiff: account.fullVolume - simReport.startInvestment
        }
      }
    })
  }

  const logSimulationResults = (simReport, traderReports) => {
    topTraders(traderReports).forEach(report => {
      const clientId = report.clientId
      const amount = amountString(report.run.amount)
      const volume = volumeString(report.run.volume)
      const fullVolume = volumeString(report.run.fullVolume)
      const investDiff = volumeString(report.run.investDiff)
      const price = priceString(simReport.transactions.endPrice)

      logger.info(`[${clientId}]: ${fullVolume} (${investDiff}) = ${volume} + ${amount} (${price})`)
    })
  }

  const topTraders = tradeReports => {
    const sorted = tradeReports.sort((repA, repB) => repB.run.fullVolume - repA.run.fullVolume)
    return tradeReports.length > simConfig.rankingLimit
      ? sorted.slice(0, simConfig.rankingLimit)
      : sorted
  }

  return { storeSimulationResults }
}

module.exports = SimReporter
