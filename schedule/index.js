const schedule = require('node-schedule')

const mongoConnection = require('../utils/mongoConnection')
const config = require('../utils/tantalusConfig').config
const { TantalusLogger } = require('../utils/tantalusLogger')

const LatestTickerService = require('./latestTickerService')
const GraphService = require('./graphService')

const mainLogger = TantalusLogger(console)

const shutdown = () => {
  mainLogger.info('stopped')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

mongoConnection.connect(config, mainLogger)
  .then(() => {
    mainLogger.info('setting up scheduler...')
    const latestTickerService = LatestTickerService(mainLogger)
    const graphService = GraphService(mainLogger)

    schedule.scheduleJob('*/1 * * * *', () => latestTickerService.storeTickers()
      .then(graphService.createGraphDatasets))

    mainLogger.info('ready')
  })
