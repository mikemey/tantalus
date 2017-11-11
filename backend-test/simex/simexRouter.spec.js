/* global describe before beforeEach it */
const express = require('express')
const bodyParser = require('body-parser')
const moment = require('moment')

const request = require('supertest')
const chai = require('chai')
chai.use(require('chai-string'))

const createSimexRouter = require('../../backend/simex')

describe('SimEx router', () => {
  const API_PREFIX = '/api/simex'
  const defaultClientId = '13014'

  let app, transactionServiceMock

  const createTransactionServiceMock = () => {
    let listener = []

    const setTransactions = newTransactions => listener
      .forEach(listener => listener(newTransactions))

    const getTransactionsListener = () => listener
    const addTransactionsListener = transactionsListener => listener.push(transactionsListener)

    return { setTransactions, addTransactionsListener, getTransactionsListener }
  }

  beforeEach(() => {
    app = express()
    app.use(bodyParser.json())

    transactionServiceMock = createTransactionServiceMock()
    app.use(API_PREFIX, createSimexRouter(console, transactionServiceMock))
  })

  const extractBody = req => req.expect(200).then(({ body }) => body)

  const getOpenOrders = () => extractBody(request(app)
    .get(`${API_PREFIX}/${defaultClientId}/open_orders`)
  )

  const postBuyOrder = (amount, price, clientId = defaultClientId) => extractBody(request(app)
    .post(`${API_PREFIX}/${clientId}/buy`)
    .send({ amount, price })
  )

  const postSellOrder = (amount, price, clientId = defaultClientId) => extractBody(request(app)
    .post(`${API_PREFIX}/${clientId}/sell`)
    .send({ amount, price })
  )

  const postCancelOrder = id => request(app)
    .post(`${API_PREFIX}/${defaultClientId}/cancel_order`)
    .send({ id })
    .expect(200)

  const getTransactions = () => extractBody(request(app)
    .get(`${API_PREFIX}/transactions`)
  )

  const getAccount = () => extractBody(request(app)
    .get(`${API_PREFIX}/${defaultClientId}/account`)
  )

  const getAllAccounts = () => extractBody(request(app)
    .get(`${API_PREFIX}/accounts`)
  ).then(accounts => accounts.reduce((map, account) => {
    map.set(account.clientId, account)
    return map
  }, new Map()))

  const runRequests = (...args) => Promise.all(args)

  const testTransactions = [
    { amount: 163, date: 1510215305, price: 562200, tid: 1510215305263732 },
    { amount: 1329, date: 1510215239, price: 561100, tid: 1510215239722434 },
    { amount: 671, date: 1510215239, price: 5613.00, tid: 1510215239721367 }
  ]

  let transactionId = 1000
  const createTx = (amount, price) => {
    return {
      amount,
      price,
      date: moment.utc().unix(),
      tid: transactionId++
    }
  }

  const makeBitcoinAvailable = amount => postBuyOrder(amount, 10)
    .then(() => transactionServiceMock.setTransactions([createTx(amount, 10)]))

  describe('transactions', () => {
    it('registers on transaction service as listener', () => {
      const updateFunction = transactionServiceMock.getTransactionsListener()[0]
      updateFunction.name.should.equal('transactionsUpdate')
      updateFunction.toString().should.startsWith('newTransactions')
    })

    it('empty transactions when nothing happened', () => {
      return getTransactions()
        .then(transactions => transactions.should.deep.equal([]))
    })

    it('new transactions after listener update', () => {
      transactionServiceMock.setTransactions(testTransactions)
      return getTransactions()
        .then(transactions => transactions.should.deep.equal(testTransactions))
    })
  })

  describe('statistics', () => {
    it('should set start date', () => {
      return getTransactions()
        .then(getAccount)
        .then(account => {
          moment.utc().diff(account.stats.startDate, 'seconds').should.equal(0)
        })
    })

    it('does NOT increase request counter for transaction request', () => {
      return checkRequestCounter(0, getTransactions())
    })

    it('increase request counter for requests buy/sell/cancel/openOrders', () => {
      return checkRequestCounter(6, makeBitcoinAvailable(1241)
        .then(() => runRequests(
          postBuyOrder(123, 356),
          postBuyOrder(123, 356),
          postSellOrder(1241, 453),
          postCancelOrder(234),
          getOpenOrders(),
          getTransactions()
        ))
      )
    })

    it('should return all accounts', () => {
      const clientA = 'c1'
      const clientB = 'c2'

      return makeBitcoinAvailable(1241)
        .then(() => runRequests(
          postBuyOrder(123, 356, clientA),
          postBuyOrder(123, 356, clientB),
          postBuyOrder(567, 890, clientA)
        ))
        .then(getAllAccounts)
        .then(allAccounts => {
          allAccounts.get(clientA).stats.requestCount.should.equal(2)
          allAccounts.get(clientB).stats.requestCount.should.equal(1)
        })
    })

    const checkRequestCounter = (expectedCount, startPromise) => startPromise
      .then(getAccount)
      .then(account => {
        const expectedAfterAccount = expectedCount + 1
        account.stats.requestCount.should.equal(expectedAfterAccount)
      })
  })

  describe('BUY/SELL orders', () => {
    it('should accept and return a new buy order', () => {
      const amount = 123
      const price = 505
      return postBuyOrder(amount, price)
        .then(exchangeOrder => {
          exchangeOrder.id.should.be.ok
          const orderDate = moment.unix(exchangeOrder.datetime)
          moment.utc().diff(orderDate, 'seconds').should.equal(0)
          // type - buy or sell (0 - buy; 1 - sell)
          exchangeOrder.type.should.equal(0)
          exchangeOrder.amount.should.equal(amount)
          exchangeOrder.price.should.equal(price)
        })
    })

    it('should accept and return a new sell order', () => {
      const amount = 123
      const price = 505
      return makeBitcoinAvailable(125)
        .then(() => postSellOrder(amount, price))
        .then(exchangeOrder => {
          exchangeOrder.id.should.be.ok
          const orderDate = moment.unix(exchangeOrder.datetime)
          moment.utc().diff(orderDate, 'seconds').should.equal(0)
          // type - buy or sell (0 - buy; 1 - sell)
          exchangeOrder.type.should.equal(1)
          exchangeOrder.amount.should.equal(amount)
          exchangeOrder.price.should.equal(price)
        })
    })

    it('should accept multiple orders', () => {
      return makeBitcoinAvailable(123)
        .then(() => runRequests(
          postBuyOrder(123, 5677),
          postSellOrder(123, 123),
          postBuyOrder(125, 2677)
        ))
        .then(getOpenOrders)
        .then(openOrders => {
          openOrders.length.should.equal(3)
          openOrders[0].id.should.not.equal(openOrders[1].id)
          openOrders[1].id.should.not.equal(openOrders[2].id)
          openOrders[0].id.should.not.equal(openOrders[2].id)
        })
    })

    it('should cancel order and return true', () => {
      return makeBitcoinAvailable(213124)
        .then(() => postSellOrder(213124, 12321))
        .then(exchangeOrder => postCancelOrder(exchangeOrder.id))
        .then(result => result.text.should.equal('true'))
    })

    it('should not cancel order and return false when order not found', () => {
      return makeBitcoinAvailable(240)
        .then(() => postSellOrder(231, 1231))
        .then(() => postCancelOrder(999))
        .then(result => result.text.should.equal('false'))
    })

    it('should cancel sell/post orders', () => {
      let keptOrder = null
      return makeBitcoinAvailable(56)
        .then(() => runRequests(
          postBuyOrder(12, 34),
          postSellOrder(56, 78),
          postBuyOrder(90, 12)
        ))
        .then(exchangeOrders => {
          exchangeOrders.length.should.equal(3)
          keptOrder = exchangeOrders[1]
          return runRequests(
            postCancelOrder(exchangeOrders[0].id),
            postCancelOrder(exchangeOrders[2].id)
          )
        })
        .then(getOpenOrders)
        .then(openOrders => {
          openOrders.length.should.equal(1)
          openOrders[0].should.deep.equal(keptOrder)
        })
        .then(getAccount)
        .then(account => {
          account.stats.requestCount.should.equal(8)
        })
    })

    it('resolves all open orders of different clients', () => {
      const clientA = '1234'
      const clientB = '9876'
      return runRequests(
        postBuyOrder(500, 50000, clientA),
        postBuyOrder(300, 50500, clientB)
      ).then(() => runRequests(
        postBuyOrder(500, 50200, clientA),
        postBuyOrder(900, 51000, clientB)
      )).then(() => transactionServiceMock.setTransactions([createTx(1000, 50000)]))
        .then(getAllAccounts)
        .then(allAccounts => {
          allAccounts.get(clientA).balances.should.deep.equal({
            gbp_balance: 94990, gbp_available: 94990, gbp_reserved: 0,
            xbt_balance: 1000, xbt_available: 1000, xbt_reserved: 0
          })
          allAccounts.get(clientB).balances.should.deep.equal({
            gbp_balance: 94915, gbp_available: 93895, gbp_reserved: 1020,
            xbt_balance: 1000, xbt_available: 1000, xbt_reserved: 0
          })
        })
        .then(() => runRequests(
          postSellOrder(250, 51500, clientA),
          postSellOrder(330, 51600, clientB)
        ))
        .then(() => transactionServiceMock.setTransactions([createTx(220, 52000)]))
        .then(getAllAccounts)
        .then(accounts => {
          accounts.get(clientA).balances.should.deep.equal({
            gbp_balance: 96123, gbp_available: 96123, gbp_reserved: 0,
            xbt_balance: 780, xbt_available: 750, xbt_reserved: 30
          })
          accounts.get(clientB).balances.should.deep.equal({
            gbp_balance: 96050, gbp_available: 95030, gbp_reserved: 1020,
            xbt_balance: 780, xbt_available: 670, xbt_reserved: 110
          })
        })
    })
  })
})
