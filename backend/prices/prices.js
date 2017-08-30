const express = require('express')

const pricesService = require('./pricesService')

const createPriceRouter = log => {
  const router = express.Router()

  const jsonPrices = prices => prices.map(ticker => {
    return {
      ticker: ticker.name,
      buy: ticker.buy,
      sell: ticker.sell,
      duration: ticker.duration
    }
  })

  router.get('/', (req, res) => {
    log.info('received prices request')

    return pricesService.getPrices()
      .then(prices => res.status(200).json(jsonPrices(prices)))
  })

  return router
}

module.exports = createPriceRouter
