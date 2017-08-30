const express = require('express')

const createTickersService = require('./tickersService')

const createTickersRouter = log => {
  const router = express.Router()
  const tickersService = createTickersService()

  router.get('/latest', (req, res) => tickersService.getLatest()
    .then(ticker => res.status(200).json(ticker))
  )

  return router
}

module.exports = createTickersRouter
