const express = require('express')

const requests = require('../../utils/requests')

const KRAKEN = 'Kraken'
const BINANCE = 'Binance'

const ETH_BTC = 'ETH/BTC'
const XRP_BTC = 'XRP/BTC'
const LSK_BTC = 'LSK/BTC'

const createMarketsRouter = logger => {
  const router = express.Router()

  const singleMarketQueries = [{
    name: BINANCE,
    trading: ETH_BTC,
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHBTC',
    price: jsonResponse => jsonResponse.price
  }, {
    name: BINANCE,
    trading: XRP_BTC,
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=XRPBTC',
    price: jsonResponse => jsonResponse.price
  }, {
    name: BINANCE,
    trading: LSK_BTC,
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=LSKBTC',
    price: jsonResponse => jsonResponse.price
  }]

  const errorHandler = name => err => {
    logger.error(err.message)
    return { name, message: err.message }
  }

  const requestKrakenData = () => requests
    .getJson('https://api.kraken.com/0/public/Ticker?pair=XXRPXXBT,XETHXXBT')
    .then(response => {
      return [
        extractFromKrakenResonse(response, 'XETHXXBT', 'ETH/BTC'),
        extractFromKrakenResonse(response, 'XXRPXXBT', 'XRP/BTC')
      ]
    })
    .catch(errorHandler(KRAKEN))

  const extractFromKrakenResonse = (response, symbol, trading) => {
    return {
      name: KRAKEN,
      trading,
      price: response.result[symbol].c[0]
    }
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
