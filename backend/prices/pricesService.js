const requests = require('../utils/requests')
const fmt = require('../utils/formats')

const tickers = {
  solidi: { url: 'https://www.solidi.co/index', name: 'solidi' },
  lakebtc: { url: 'https://api.LakeBTC.com/api_v2/ticker', name: 'lakebtc' },
  coinfloor: { url: 'https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/ticker/', name: 'coinfloor' },
  coindesk: { url: 'https://api.coindesk.com/site/headerdata.json?currency=BTC', name: 'coindesk' }
}

const transformAskBid = (name, json) => {
  const buy = fmt.rate(json.ask)
  const sell = fmt.rate(json.bid)
  return { name, buy, sell }
}

const tickerErrorHandler = ticker => err => {
  console.info(err.message)
  return { name: ticker.name, buy: null, sell: null }
}

const getSolidiPrices = () => requests
  .getHtml(tickers.solidi.url)
  .then($ => transformAskBid(tickers.solidi.name, {
    ask: fmt.rate($('#buybtcrate').val()),
    bid: fmt.rate($('#sellbtcrate').val())
  }))
  .catch(tickerErrorHandler(tickers.solidi))

const getLakebtcPrices = () => requests
  .getJson(tickers.lakebtc.url)
  .then(({ btcgbp }) => transformAskBid(tickers.lakebtc.name, btcgbp))
  .catch(tickerErrorHandler(tickers.lakebtc))

const getCoinfloorPrices = () => requests
  .getJson(tickers.coinfloor.url)
  .then(responseJson => transformAskBid(tickers.coinfloor.name, responseJson))
  .catch(tickerErrorHandler(tickers.coinfloor))

const getCoindeskPrices = () => requests
  .getJson(tickers.coindesk.url)
  .then(responseJson => {
    const rate = responseJson.bpi.GBP.rate_float
    return transformAskBid(tickers.coindesk.name, { ask: rate, bid: rate })
  })
  .catch(tickerErrorHandler(tickers.coindesk))

const addDuration = execPromise => {
  const start = Date.now()
  return execPromise()
    .then(result => Object.assign(result, { duration: fmt.duration(start) }))
}

const withDuration = execPromises => execPromises.map(addDuration)

module.exports = {
  getPrices: () => Promise.all(withDuration([
    getSolidiPrices,
    getLakebtcPrices,
    getCoinfloorPrices,
    getCoindeskPrices
  ]))
}
