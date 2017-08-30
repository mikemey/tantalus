const schedule = require('node-schedule')

const createTickersService = require('../tickers/tickersService')

const Scheduler = () => {
  const tickersService = createTickersService()
  schedule.scheduleJob('*/1 * * * *', tickersService.storeTickers)
}

module.exports = Scheduler
