const express = require('express')

const TradeAccount = require('./tradeAccount')

const createSimexRouter = (tantalusLogger, transactionService) => {
  const router = express.Router()

  const data = {
    transactions: [],
    tradeAccounts: new Map()
  }

  const transactionsUpdate = newTransactions => {
    data.transactions = newTransactions
    return Promise.all(Array.from(data.tradeAccounts.values())
      .map(tradeAccount => Promise.resolve([tradeAccount.transactionsUpdate(newTransactions)]))
    )
  }

  const injectTrader = (req, res, next) => {
    const clientId = req.params.clientId
    if (clientId !== undefined) {
      req.trader = getOrCreateTradeAccount(clientId)
      req.trader.increaseRequestCount()
    }
    return next()
  }

  const getOrCreateTradeAccount = clientId => {
    if (!data.tradeAccounts.has(clientId)) {
      data.tradeAccounts.set(clientId, TradeAccount(tantalusLogger, clientId))
    }
    return data.tradeAccounts.get(clientId)
  }

  router.get('/transactions', (req, res) => {
    return res.status(200).json(data.transactions)
  })

  router.get('/accounts', (req, res) => {
    const accounts = Array
      .from(data.tradeAccounts.keys())
      .map(clientId => data.tradeAccounts.get(clientId).getAccount())

    return res.status(200).json(accounts)
  })

  router.get('/:clientId/account', injectTrader, (req, res) => {
    return res.status(200).json(req.trader.getAccount())
  })

  router.post('/:clientId/sell', injectTrader, (req, res) => {
    return newOrder(req, res, req.trader.newSellOrder)
  })

  router.post('/:clientId/buy', injectTrader, (req, res) => {
    return newOrder(req, res, req.trader.newBuyOrder)
  })

  const newOrder = (req, res, traderFunc) => {
    const amount = req.body.amount
    const price = req.body.price
    return res.status(200).json(traderFunc(amount, price))
  }

  router.get('/:clientId/open_orders', injectTrader, (req, res) => {
    return res.status(200).json(req.trader.getOpenOrders())
  })

  router.post('/:clientId/cancel_order', injectTrader, (req, res) => {
    const orderId = req.body.id
    return res.status(200).send(req.trader.cancelOrder(orderId))
  })

  transactionService.addTransactionsListener(transactionsUpdate)
  return router
}

module.exports = createSimexRouter
