const requests = require('../utils/requests')
const fmt = require('./formats')
const ScheduleRepo = require('./scheduleRepo')

const tickers = [{
  url: 'https://api.pro.coinbase.com/products/BTC-EUR/ticker',
  name: 'gdax',
  transform: json => {
    const bid = fmt.rate(json.bid)
    const ask = fmt.rate(json.ask)
    return { name: 'gdax', bid, ask }
  }
}, {
  url: 'https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCEUR',
  name: 'binance',
  transform: json => {
    const bid = fmt.rate(json.bidPrice)
    const ask = fmt.rate(json.askPrice)
    return { name: 'binance', bid, ask }
  }
}, {
  url: 'https://api.coindesk.com/v1/bpi/currentprice.json',
  name: 'coindesk',
  transform: json => {
    const ask = fmt.rate(json.bpi.EUR.rate_float)
    return { name: 'coindesk', ask }
  }
}]

const NOT_AVAIL = 'N/A'

const getTicker = log => tickerConfig => requests
  .getJson(tickerConfig.url)
  .then(tickerConfig.transform)
  .catch(tickerErrorHandler(tickerConfig, log))

const tickerErrorHandler = (tickerConfig, log) => err => {
  log.error(err.message)
  return { name: tickerConfig.name, bid: NOT_AVAIL, ask: NOT_AVAIL }
}

const countData = tickers => tickers.filter(
  ticker => ticker.bid !== NOT_AVAIL || ticker.ask !== NOT_AVAIL
).length

const LatestTickerService = (log, metadataService) => {
  const scheduleRepo = ScheduleRepo()
  const setMetadata = tickerData => metadataService.setTickerCount(countData(tickerData.tickers))

  const storeTickers = created => Promise
    .all(tickers.map(getTicker(log)))
    .then(tickers => {
      log.info('updated ticker: ' + countData(tickers))
      return { created, tickers }
    })
    .then(scheduleRepo.storeLatestTickers)
    .then(setMetadata)
    .catch(err => {
      log.info('error occurred (eur)')
      log.error(err)
    })

  return {
    storeTickers
  }
}

module.exports = LatestTickerService
