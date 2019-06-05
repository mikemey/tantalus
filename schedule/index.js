const schedule = require('node-schedule')

const mongoConnection = require('../utils/mongoConnection')
const config = require('../utils/tantalusConfig').config
const { TantalusLogger } = require('../utils/tantalusLogger')

const LatestTickerService = require('./latestTickerService')
const GraphService = require('./graphService')
const MetadataService = require('./metadataService')

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
    const metadataService = MetadataService()
    const latestTickerService = LatestTickerService(mainLogger, metadataService)
    const graphService = GraphService(mainLogger, metadataService)

    schedule.scheduleJob('*/1 * * * *', () => {
      const creationDate = new Date()
      return latestTickerService.storeTickers(creationDate)
        .then(graphService.createGraphDatasets)
        .then(() => metadataService.writeData(creationDate))
    })

    mainLogger.info('ready')
  })
