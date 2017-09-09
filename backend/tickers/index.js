const express = require('express')
const moment = require('moment')
const { responseError } = require('../utils/jsonResponses')

const createTickersService = require('./tickersService')

const now = () => moment.utc()

const cutoffDate = period => {
  switch (period) {
    case '1d': return now().subtract(1, 'd').toDate()
    case '1w': return now().subtract(1, 'w').toDate()
    case '1m': return now().subtract(1, 'M').toDate()
    case '3m': return now().subtract(3, 'M').toDate()
    case '1y': return now().subtract(1, 'y').toDate()
    default:
      return period
  }
}

const createTickersRouter = logger => {
  const router = express.Router()
  const tickersService = createTickersService()

  router.get('/latest', (req, res) => tickersService.getLatest()
    .then(ticker => res.status(200).json(ticker))
  )

  router.get('/graph', (req, res) => {
    const cutoff = cutoffDate(req.query['period'])
    if (!moment.isDate(cutoff)) {
      const msg = `Unsupported period: '${cutoff}'`
      logger.warn(msg)
      return responseError(res, msg)
    }

    return tickersService.getGraphData(cutoff)
      .then(graphData => res.status(200).json(graphData))
  })

  return router
}

module.exports = createTickersRouter
