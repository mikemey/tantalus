const express = require('express')

const InvestService = require('./investService')

const createInvestRouter = (tantalusLogger, transactionsService) => {
  const router = express.Router()
  const investService = InvestService(tantalusLogger, transactionsService)

  router.get('/transactions', (req, res) =>
    res.status(200).json(investService.getTransactionsData())
  )

  return router
}

module.exports = createInvestRouter
