const express = require('express')
const { responseError } = require('../utils/jsonResponses')

const createTickersRepo = require('./tickersRepo')
const { supportedPeriods } = require('./graphPeriods')

const createTickersRouter = logger => {
  const router = express.Router()
  const tickersRepo = createTickersRepo()

  router.get('/latest', (req, res) => tickersRepo.getLatest()
    .then(ticker => res.status(200).json(ticker))
  )

  router.get('/graph', (req, res) => {
    const period = req.query['period']
    if (!supportedPeriods.includes(period)) {
      const msg = `Unsupported period: '${period}'`
      logger.warn(msg)
      return responseError(res, msg)
    }

    return tickersRepo.getGraphData(period)
      .then(graphData => res.status(200).json(graphData))
  })

  return router
}

module.exports = createTickersRouter
