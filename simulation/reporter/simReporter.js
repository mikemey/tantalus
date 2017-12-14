const { TantalusLogger } = require('../../utils/tantalusLogger')
const { amountString, priceString, volumeString } = require('../../utils/ordersHelper')

const SimRepo = require('./simRepo')

const TransactionRepo = require('../../transactions/transactionsRepo')
const TransactionsSource = require('../txtrader/txSource')

const checkConfig = config => {
  if (!config.batchSeconds) throwError('batchSeconds')
  if (!config.startInvestment) throwError('startInvestment')
  if (!config.partitionWorkerCount) throwError('partitionWorkerCount')
  if (!config.rankingLimit) throwError('rankingLimit')
}

const throwError = name => {
  throw Error(`${name} not configured!`)
}

const SimReporter = (baseLogger, simConfig, createTxSource = TransactionsSource) => {
  checkConfig(simConfig)
  const logger = TantalusLogger(baseLogger, 'Report')
  const simrepo = SimRepo()

  const data = {
    staticReportData: null
  }

  const getStaticReportData = () => data.staticReportData !== null
    ? Promise.resolve(data.staticReportData)
    : loadStaticReportData()

  const loadStaticReportData = () => {
    data.staticReportData = createTxSource(logger, TransactionRepo())
    return data.staticReportData.reset(simConfig.batchSeconds)
      .then(() => data.staticReportData)
  }

  const storeSimulationResults = (
    simulationId, startHrtime, endHrtime,
    allAccounts, traderCount, iteration
  ) => getStaticReportData()
    .then(staticReportData => {
      const simReport = createSimulationReport(
        simulationId, startHrtime, endHrtime, staticReportData, traderCount, iteration
      )
      return simrepo.storeSimulationReport(simReport)
        .then(() => {
          const traderReports = createTraderReports(simReport, allAccounts)
          return Promise.all([
            simrepo.storeTraderReports(traderReports),
            logSimulationResults(simReport, traderReports)
          ]).then(() => simReport)
        })
    })

  const createSimulationReport = (
    simulationId, startHrtime, endHrtime, staticReportData, traderCount, iteration
  ) => {
    const startPrice = staticReportData.getStartPrice()
    const endPrice = staticReportData.getEndPrice()
    const startInvestment = simConfig.startInvestment
    const staticInvestment = Math.round(startInvestment / startPrice * endPrice)
    return {
      simulationId,
      iteration,
      startDate: startHrtime[0],
      endDate: endHrtime[0],
      workerCount: simConfig.partitionWorkerCount,
      traderCount,
      startInvestment,
      staticInvestment,
      transactions: {
        count: staticReportData.transactionCount(),
        startDate: staticReportData.getStartDate(),
        endDate: staticReportData.getEndDate(),
        startPrice,
        endPrice
      },
      batches: {
        count: staticReportData.batchCount(),
        duration: simConfig.batchSeconds
      }
    }
  }

  const createTraderReports = (simReport, allAccounts) => {
    return allAccounts.map(account => {
      return {
        clientId: account.clientId,
        simulationId: simReport.simulationId,
        iteration: simReport.iteration,
        amount: account.amount,
        volume: account.volume,
        fullVolume: account.fullVolume,
        investDiff: account.fullVolume - simReport.staticInvestment,
        absoluteDiff: account.fullVolume - simReport.startInvestment
      }
    })
  }

  const logSimulationResults = (simReport, traderReports) => topTraders(traderReports)
    .forEach(report => {
      const clientId = report.clientId
      const amount = amountString(report.amount)
      const volume = volumeString(report.volume)
      const fullVolume = volumeString(report.fullVolume)
      const investDiff = volumeString(report.investDiff)
      const price = priceString(simReport.transactions.endPrice)

      logger.info(`[${clientId}]: ${fullVolume} (${investDiff}) = ${volume} + ${amount} (${price})`)
    })

  const topTraders = tradeReports => {
    const sorted = tradeReports.sort((repA, repB) => repB.fullVolume - repA.fullVolume)
    return tradeReports.length > simConfig.rankingLimit
      ? sorted.slice(0, simConfig.rankingLimit)
      : sorted
  }

  return { storeSimulationResults }
}

module.exports = SimReporter
