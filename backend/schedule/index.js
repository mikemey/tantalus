const schedule = require('node-schedule')

const mongoConnection = require('../utils/mongoConnection')
const config = require('../config').config
const { TantalusLogger } = require('../utils/tantalusLogger')

const LatestTickerService = require('./latestTickerService')
const GraphService = require('./graphService')
const TransactionsService = require('../simex/transactionsService')

const mainLogger = TantalusLogger(console)

mongoConnection.initializeDirectConnection(config, mainLogger)
  .then(() => {
    mainLogger.info('setting up scheduler...')
    const latestTickerService = LatestTickerService(mainLogger)
    const graphService = GraphService(mainLogger)
    const transactionsService = TransactionsService(mainLogger, config)
    const transactionsStoreSchedule = config.simex.transactionsStoreUpateSchedule

    schedule.scheduleJob('*/1 * * * *', () => latestTickerService.storeTickers()
      .then(graphService.createGraphDatasets))

    schedule.scheduleJob(transactionsStoreSchedule, () => transactionsService.storeTransactions())

    mainLogger.info('ready')
  })
