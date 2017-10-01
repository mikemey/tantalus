const schedule = require('node-schedule')

const mongoConnection = require('./utils/mongoConnection')
const config = require('./config').config
const log = console

mongoConnection.initializeDirectConnection(config, log)
  .then(() => {
    log.info('setting up scheduler...')
    const latestTickerService = require('./schedule/latestTickerService')(log)
    const graphService = require('./schedule/graphService')(log)

    schedule.scheduleJob('*/1 * * * *', () => latestTickerService.storeTickers()
      .then(graphService.createGraphDatasets))
  })
