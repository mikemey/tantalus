const schedule = require('node-schedule')

const mongoConnection = require('../utils/mongoConnection')
const config = require('../config').config
const { createOrderLogger } = require('../utils/ordersHelper')

const baseLogger = console
const mainLogger = createOrderLogger(baseLogger)

mongoConnection.initializeDirectConnection(config, mainLogger)
  .then(() => {
    mainLogger.info('setting up scheduler...')
    const latestTickerService = require('./latestTickerService')(mainLogger)
    const graphService = require('./graphService')(mainLogger)

    schedule.scheduleJob('*/1 * * * *', () => latestTickerService.storeTickers()
      .then(graphService.createGraphDatasets))

    mainLogger.info('ready')
  })
