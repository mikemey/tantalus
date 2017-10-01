const requests = require('./requests')
const fmt = require('./formats')
const ScheduleRepo = require('./scheduleRepo')

const tickers = {
  solidi: { url: 'https://www.solidi.co/index', name: 'solidi' },
  lakebtc: { url: 'https://api.LakeBTC.com/api_v2/ticker', name: 'lakebtc' },
  coinfloor: { url: 'https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/ticker/', name: 'coinfloor' },
  coindesk: { url: 'https://api.coindesk.com/site/headerdata.json?currency=BTC', name: 'coindesk' },
  cex: { url: 'https://cex.io/api/ticker/BTC/GBP', name: 'cex' }
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

const solidiTransform = element => {
  const result = element.val()
  return result > 0 ? result : NOT_AVAIL
}

const getSolidiTicker = log => requests
  .getHtml(tickers.solidi.url)
  .then($ => transformAskBid(tickers.solidi.name, {
    bid: solidiTransform($('#buybtcrate')),
    ask: solidiTransform($('#sellbtcrate'))
  }))
  .catch(tickerErrorHandler(tickers.solidi, log))

const getLakebtcTicker = log => requests
  .getJson(tickers.lakebtc.url)
  .then(({ btcgbp }) => transformAskBid(tickers.lakebtc.name, btcgbp))
  .catch(tickerErrorHandler(tickers.lakebtc, log))

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

const LatestTickerService = log => {
  const scheduleRepo = ScheduleRepo()

  const storeTickers = () => Promise.all([
    getSolidiTicker(log),
    getLakebtcTicker(log),
    getBidAskTicker(log, tickers.coinfloor),
    getCoindeskTicker(log),
    getBidAskTicker(log, tickers.cex)
  ]).then(tickers => {
    const created = new Date()
    log.info(created.toISOString() + ' - updated ticker: ' + countData(tickers))
    return { created, tickers }
  }).then(scheduleRepo.storeLatestTickers)

  return {
    storeTickers
  }
}

module.exports = LatestTickerService
