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
  json.ask ? { buy: fmt.rate(json.ask) } : undefined,
  json.bid ? { sell: fmt.rate(json.bid) } : undefined
)

const tickerErrorHandler = ticker => err => {
  console.info(err.message)
  return { name: ticker.name, buy: NOT_AVAIL, sell: NOT_AVAIL }
}

const getSolidiTicker = () => requests
  .getHtml(tickers.solidi.url)
  .then($ => transformAskBid(tickers.solidi.name, {
    ask: fmt.rate($('#buybtcrate').val()),
    bid: fmt.rate($('#sellbtcrate').val())
  }))
  .catch(tickerErrorHandler(tickers.solidi))

const getLakebtcTicker = () => requests
  .getJson(tickers.lakebtc.url)
  .then(({ btcgbp }) => transformAskBid(tickers.lakebtc.name, btcgbp))
  .catch(tickerErrorHandler(tickers.lakebtc))

const getCoinfloorTicker = () => requests
  .getJson(tickers.coinfloor.url)
  .then(responseJson => transformAskBid(tickers.coinfloor.name, responseJson))
  .catch(tickerErrorHandler(tickers.coinfloor))

const getCoindeskTicker = () => requests
  .getJson(tickers.coindesk.url)
  .then(responseJson => {
    const rate = responseJson.bpi.GBP.rate_float
    return transformAskBid(tickers.coindesk.name, { ask: rate })
  })
  .catch(tickerErrorHandler(tickers.coindesk))

const addDuration = execPromise => {
  const start = Date.now()
  return execPromise()
    .then(result => Object.assign(result, { duration: fmt.duration(start) }))
}

const withDuration = execPromises => execPromises.map(addDuration)

const count = tickers => tickers.reduce((sum, ticker) => {
  if (ticker.buy) sum += 1
  return sum
}, 0)

const TickerScheduleService = log => {
  const tickersRepo = createTickersRepo()

  const storeTickers = () => Promise.all(withDuration([
    getSolidiTicker,
    getLakebtcTicker,
    getCoinfloorTicker,
    getCoindeskTicker
  ])).then(tickers => {
    const created = new Date()
    log.info(created.toISOString() + ' - updated ticker: ' + count(tickers))
    return { created, tickers }
  }).then(tickersRepo.storeTickersData)

  return {
    storeTickers
  }
}

module.exports = TickerScheduleService
