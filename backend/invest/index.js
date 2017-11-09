const express = require('express')

const InvestService = require('./investService')

const createInvestRouter = (logger, transactionsService) => {
  const router = express.Router()
  const investService = InvestService(logger, transactionsService)

  router.get('/transactions', (req, res) =>
    res.status(200).json(investService.getTransactionsData())
  )

  return router
}

module.exports = createInvestRouter
