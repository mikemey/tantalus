const express = require('express')

const pricesService = require('./pricesService')

const createPriceRouter = log => {
  const router = express.Router()

  const jsonPrices = prices => prices.map(({ name, buy, sell, duration }) => {
    return { ticker: name, buy, sell, duration }
  })

  router.get('/', (req, res) => {
    log.info('received prices request')
    return pricesService.getPrices()
      .then(prices => res.status(200).json(jsonPrices(prices)))
  })

  return router
}

module.exports = createPriceRouter
