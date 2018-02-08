const express = require('express')

const requests = require('../../utils/requests')

const binancePriceUrl = symbol => `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
const binanceInfoUrl = 'https://api.binance.com/api/v1/exchangeInfo'

const queryBinance = query => {
  const symbols = query.split(',')
  return Promise.all(symbols.map(symbol => requests.getJson(binancePriceUrl(symbol))))
}
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
      return queryBinance(req.query.symbols)
        .then(responses => {
          responses.forEach(symbolPrice => { symbolPrice.price = Number(symbolPrice.price) })
          res.json(responses)
        })
        .catch(error => {
          logger.log(error)
          res.json([])
        })
    }
    return res.status(404).send(`market not supported: ${req.params.market}`)
  })

  return router
}

module.exports = createMarketsRouter
