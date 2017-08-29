const express = require('express')

const solidi = require('./solidi')

const createPriceRouter = log => {
  const router = express.Router()

  const jsonPrices = prices => prices.reduce((json, currentVal) => Object.assign(json, {
    [currentVal.name]: {
      buy: currentVal.buy,
      sell: currentVal.sell,
      duration: currentVal.duration
    }
  }), {})

  router.get('/', (req, res) => {
    log.info('received prices request')

    return Promise.all([solidi.getPrices()])
      .then(prices => res.status(200).json(jsonPrices(prices)))
  })

  return router
}

module.exports = createPriceRouter
