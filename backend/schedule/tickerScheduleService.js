const requests = require('../utils/requests')
const fmt = require('../utils/formats')
const createTickersRepo = require('../tickers/tickersRepo')

const tickers = {
  solidi: { url: 'https://www.solidi.co/index', name: 'solidi' },
  lakebtc: { url: 'https://api.LakeBTC.com/api_v2/ticker', name: 'lakebtc' },
  coinfloor: { url: 'https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/ticker/', name: 'coinfloor' },
  coindesk: { url: 'https://api.coindesk.com/site/headerdata.json?currency=BTC', name: 'coindesk' }
}

const NOT_AVAIL = 'N/A'

const transformAskBid = (name, json) => Object.assign(
  { name },
  json.bid !== undefined ? { bid: fmt.rate(json.bid) } : undefined,
  json.ask !== undefined ? { ask: fmt.rate(json.ask) } : undefined
)

const tickerErrorHandler = (ticker, log) => err => {
  log.error(err.message)
  return { name: ticker.name, bid: NOT_AVAIL, ask: NOT_AVAIL }
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

const getCoinfloorTicker = log => requests
  .getJson(tickers.coinfloor.url)
  .then(responseJson => transformAskBid(tickers.coinfloor.name, responseJson))
  .catch(tickerErrorHandler(tickers.coinfloor, log))

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

const TickerScheduleService = log => {
  const tickersRepo = createTickersRepo()

  const storeTickers = () => Promise.all([
    getSolidiTicker(log),
    getLakebtcTicker(log),
    getCoinfloorTicker(log),
    getCoindeskTicker(log)
  ]).then(tickers => {
    const created = new Date()
    log.info(created.toISOString() + ' - updated ticker: ' + countData(tickers))
    return { created, tickers }
  }).then(tickersRepo.storeTickersData)

  return {
    storeTickers
  }
}

module.exports = TickerScheduleService
