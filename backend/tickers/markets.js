const express = require('express')

const requests = require('../../utils/requests')

const KRAKEN = 'Kraken'
const BINANCE = 'Binance'

const UNAVAILABLE = 'N/A'
const ETH_BTC = 'ETH/BTC'
const XRP_BTC = 'XRP/BTC'
const LSK_BTC = 'LSK/BTC'

const createMarketsRouter = logger => {
  const router = express.Router()

  const extractBinancePrice = jsonResponse => jsonResponse.price
    ? jsonResponse.price
    : UNAVAILABLE

  const singleMarketQueries = [{
    name: BINANCE,
    trading: ETH_BTC,
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHBTC',
    price: extractBinancePrice
  }, {
    name: BINANCE,
    trading: XRP_BTC,
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=XRPBTC',
    price: extractBinancePrice
  }, {
    name: BINANCE,
    trading: LSK_BTC,
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=LSKBTC',
    price: extractBinancePrice
  }]

  const marketResponse = (name, trading, price) => { return { name, trading, price } }

  const errorHandler = query => err => {
    logger.error(err.message)
    return marketResponse(query.name, query.trading, UNAVAILABLE)
  }

  const requestKrakenData = () => requests
    .getJson('https://api.kraken.com/0/public/Ticker?pair=XXRPXXBT,XETHXXBT')
    .then(response => {
      return [
        extractFromKrakenResonse(response, 'XETHXXBT', ETH_BTC),
        extractFromKrakenResonse(response, 'XXRPXXBT', XRP_BTC)
      ]
    })
    .catch(error => {
      logger.error(error.message)
      return [
        marketResponse(KRAKEN, ETH_BTC, UNAVAILABLE),
        marketResponse(KRAKEN, XRP_BTC, UNAVAILABLE)]
    })

  const extractFromKrakenResonse = (response, symbol, trading) => {
    const res = response.result
    return res !== undefined && res[symbol] !== undefined && res[symbol].c[0] !== undefined
      ? marketResponse(KRAKEN, trading, res[symbol].c[0])
      : marketResponse(KRAKEN, trading, UNAVAILABLE)
  }

  const requestSingleQuery = query => {
    return requests.getJson(query.url)
      .then(result => {
        return {
          name: query.name,
          trading: query.trading,
          price: query.price(result)
        }
      })
      .catch(errorHandler(query))
  }

  router.get('/', (req, res) => {
    const requestPromises = singleMarketQueries.map(requestSingleQuery)
      .concat(requestKrakenData())
    return Promise.all(requestPromises)
      .then(result => {
        const merged = [].concat.apply([], result)
        return res.json(merged)
      })
  })

  return router
}

module.exports = createMarketsRouter
