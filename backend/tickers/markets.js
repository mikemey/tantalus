const express = require('express')

const requests = require('../../utils/requests')

const binancePriceUrl = 'https://api.binance.com/api/v3/ticker/price'
const binanceInfoUrl = 'https://api.binance.com/api/v1/exchangeInfo'

const createMarketsRouter = logger => {
  const router = express.Router()

  router.get('/:market/symbols', (req, res) => {
    if (req.params.market === 'binance') {
      return requests.getJson(binanceInfoUrl)
        .then(response => {
          const symbols = response.symbols.map(item => item.symbol)
          res.json({ symbols })
        })
        .catch(error => {
          logger.log(error)
          res.json({})
        })
    }
    return res.status(404).send(`market not supported: ${req.params.market}`)
  })

  router.get('/:market', (req, res) => {
    if (req.params.market === 'binance') {
      if (!req.query.symbols) return res.status(404).send('no symbol specified')
      return requests.getJson(binancePriceUrl)
        .then(cleanPriceResponse(req.query.symbols))
        .then(cleanResponse => res.json(cleanResponse))
        .catch(error => {
          logger.log(error)
          res.json([])
        })
    }
    return res.status(404).send(`market not supported: ${req.params.market}`)
  })

  const cleanPriceResponse = query => response => {
    const requestedSymbols = query.split(',')
    return response
      .filter(symbolPrice => requestedSymbols.includes(symbolPrice.symbol))
      .map(symbolPrice => {
        return {
          symbol: symbolPrice.symbol,
          price: Number(symbolPrice.price)
        }
      })
  }

  return router
}

module.exports = createMarketsRouter
