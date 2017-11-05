const express = require('express')

const TransactionsService = require('./transactionsService')

const createInvestRouter = logger => {
  const router = express.Router()
  const txsService = TransactionsService(logger)

  router.get('/transactions', (req, res) =>
    res.status(200).json(txsService.getTransactionsData())
  )

  return router
}

module.exports = createInvestRouter
