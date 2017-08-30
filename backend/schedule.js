const schedule = require('node-schedule')

const createTickerScheduleService = require('./schedule/tickerScheduleService')

const Scheduler = () => {
  const tickersService = createTickerScheduleService()
  schedule.scheduleJob('*/1 * * * *', tickersService.storeTickers)
}

module.exports = Scheduler
