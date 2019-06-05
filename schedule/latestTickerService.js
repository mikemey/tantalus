const requests = require('../utils/requests')
const fmt = require('./formats')
const ScheduleRepo = require('./scheduleRepo')

const tickers = {
  gdax: { url: 'https://api.gdax.com/products/BTC-GBP/ticker', name: 'gdax' },
  coinfloor: { url: 'https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/ticker/', name: 'coinfloor' },
  coindesk: { url: 'https://api.coindesk.com/site/headerdata.json?currency=BTC', name: 'coindesk' }
}

const NOT_AVAIL = 'N/A'

const transformAskBid = (name, json) => Object.assign(
  { name },
  json.bid !== undefined ? { bid: fmt.rate(json.bid) } : undefined,
  json.ask !== undefined ? { ask: fmt.rate(json.ask) } : undefined
)

const tickerErrorHandler = (tickerConfig, log) => err => {
  log.error(err.message)
  return { name: tickerConfig.name, bid: NOT_AVAIL, ask: NOT_AVAIL }
}

const getBidAskTicker = (log, tickerConfig) => requests
  .getJson(tickerConfig.url)
  .then(responseJson => transformAskBid(tickerConfig.name, responseJson))
  .catch(tickerErrorHandler(tickerConfig, log))

const getCoindeskTicker = log => requests
  .getJson(tickers.coindesk.url)
  .then(responseJson => {
    const rate = responseJson.bpi.GBP.rate_float
    return transformAskBid(tickers.coindesk.name, { ask: rate })
  })
  .catch(tickerErrorHandler(tickers.coindesk, log))

const countData = tickers => tickers.filter(
  ticker => ticker.bid !== NOT_AVAIL || ticker.ask !== NOT_AVAIL
).length

const createMetadata = metadataService => tickerData =>
  metadataService.setTickerCount(countData(tickerData.tickers))

const LatestTickerService = (log, metadataService, creationDate) => {
  const scheduleRepo = ScheduleRepo()

  const storeTickers = () => Promise.all([
    getBidAskTicker(log, tickers.gdax),
    getBidAskTicker(log, tickers.coinfloor),
    getCoindeskTicker(log)
  ]).then(tickers => {
    log.info('updated ticker: ' + countData(tickers))
    const created = creationDate
    return { created, tickers }
  }).then(scheduleRepo.storeLatestTickers)
    .then(createMetadata(metadataService))
    .catch(err => {
      log.info('error occurred')
      log.error(err)
    })

  return {
    storeTickers
  }
}

module.exports = LatestTickerService
