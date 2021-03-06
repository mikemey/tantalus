const express = require('express')

const TradeAccount = require('./tradeAccount')

const amountMissing = { message: 'Amount is missing or zero!' }
const priceMissing = { message: 'Price is missing or zero!' }

const newOrder = (req, res, traderFunc) => {
  const amount = req.body.amount
  const price = req.body.price
  if (!amount) return res.status(400).json(amountMissing)
  if (!price) return res.status(400).json(priceMissing)
  try {
    return res.status(200).json(traderFunc(amount, price))
  } catch (err) {
    return res.status(409).json({ message: err.message })
  }
}

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
      data.tradeAccounts.set(clientId, TradeAccount(tantalusLogger.baseLogger, clientId))
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
