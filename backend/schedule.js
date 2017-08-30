const schedule = require('node-schedule')

const mongoConnection = require('./utils/mongoConnection')
const config = require('./config').config
const log = console

mongoConnection.init(config, log)
  .then(() => {
    log.info('setting up scheduler...')
    const tickerScheduleService = require('./schedule/tickerScheduleService')(log)
    schedule.scheduleJob('*/10 * * * * *', tickerScheduleService.storeTickers)
  })
