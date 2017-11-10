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

  const getOpenOrders = () => request(app)
    .get(`${API_PREFIX}/${defaultClientId}/open_orders`)
    .expect(200)

  const postBuyOrder = (amount, price, clientId = defaultClientId) => request(app)
    .post(`${API_PREFIX}/${clientId}/buy`)
    .send({ amount, price })
    .expect(200)

  const postSellOrder = (amount, price, clientId = defaultClientId) => request(app)
    .post(`${API_PREFIX}/${clientId}/sell`)
    .send({ amount, price })
    .expect(200)

  const postCancelOrder = id => request(app)
    .post(`${API_PREFIX}/${defaultClientId}/cancel_order`)
    .send({ id })
    .expect(200)

  const getTransactions = () => request(app)
    .get(`${API_PREFIX}/${defaultClientId}/transactions`)
    .expect(200)

  const getAccounts = () => request(app)
    .get(`${API_PREFIX}/accounts`)
    .expect(200)
    .then(({ body }) => body.reduce((map, account) => {
      map.set(account.clientId, account)
      return map
    }, new Map()))

  const runRequests = (...args) => Promise
    .all(args)
    .then(results => results.map(result => result.body))

  const testTransactions = [
    { amount: 163, date: 1510215305, price: 562200, tid: 1510215305263732 },
    { amount: 1329, date: 1510215239, price: 561100, tid: 1510215239722434 },
    { amount: 671, date: 1510215239, price: 5613.00, tid: 1510215239721367 }
  ]

  let transactionId = 1000
  const transaction = (amount, price) => {
    return {
      amount, price,
      date: moment.utc().unix(),
      tid: transactionId++
    }
  }

  const makeBitcoinAvailable = amount => postBuyOrder(amount, 10)
    .then(() => transactionServiceMock.setTransactions([transaction(amount, 10)]))

  describe('transactions', () => {
    it('registers on transaction service as listener', () => {
      const updateFunction = transactionServiceMock.getTransactionsListener()[0]
      updateFunction.name.should.equal('transactionsUpdate')
      updateFunction.toString().should.startsWith('newTransactions')
    })

    it('empty transactions when nothing happened', () => {
      return getTransactions()
        .then(({ body }) => body.should.deep.equal([]))
    })

    it('new transactions after listener update', () => {
      transactionServiceMock.setTransactions(testTransactions)
      return getTransactions()
        .then(({ body }) => body.should.deep.equal(testTransactions))
    })
  })

  describe('statistics', () => {
    it('should set start date', () => {
      return getTransactions()
        .then(getAccounts)
        .then(accounts => {
          const account = accounts.get(defaultClientId)
          moment.utc().diff(account.stats.startDate, 'seconds').should.equal(0)
        })
    })

    it('increase request counter for transaction request', () => {
      return checkRequestCounter(1, getTransactions())
    })

    it('increase request counter for requests buy/sell/cancel/openOrders', () => {
      return checkRequestCounter(7, makeBitcoinAvailable(1241)
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

    const checkRequestCounter = (expectedCount, startPromise) => startPromise
      .then(getAccounts)
      .then(accounts => {
        const account = accounts.get(defaultClientId)
        account.stats.requestCount.should.equal(expectedCount)
      })
  })

  describe('BUY/SELL orders', () => {
    it('should accept and return a new buy order', () => {
      const amount = 123
      const price = 505
      return postBuyOrder(amount, price)
        .then(({ body }) => {
          body.id.should.be.ok
          const orderDate = moment.unix(body.datetime)
          moment.utc().diff(orderDate, 'seconds').should.equal(0)
          // type - buy or sell (0 - buy; 1 - sell)
          body.type.should.equal(0)
          body.amount.should.equal(amount)
          body.price.should.equal(price)
        })
    })

    it('should accept and return a new sell order', () => {
      const amount = 123
      const price = 505
      return makeBitcoinAvailable(125)
        .then(() => postSellOrder(amount, price))
        .then(({ body }) => {
          body.id.should.be.ok
          const orderDate = moment.unix(body.datetime)
          moment.utc().diff(orderDate, 'seconds').should.equal(0)
          // type - buy or sell (0 - buy; 1 - sell)
          body.type.should.equal(1)
          body.amount.should.equal(amount)
          body.price.should.equal(price)
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
        .then(({ body }) => {
          body.length.should.equal(3)
          body[0].id.should.not.equal(body[1].id)
          body[1].id.should.not.equal(body[2].id)
          body[0].id.should.not.equal(body[2].id)
        })
    })

    it('should cancel order and return true', () => {
      return makeBitcoinAvailable(213124)
        .then(() => postSellOrder(213124, 12321))
        .then(({ body }) => postCancelOrder(body.id))
        .then(result => result.text.should.equal('true'))
    })

    it('should not cancel order and return false when order not found', () => {
      return makeBitcoinAvailable(240)
        .then(() => postSellOrder(231, 1231))
        .then(({ body }) => postCancelOrder(999))
        .then(result => result.text.should.equal('false'))
    })

    it('should cancel sell/post orders', () => {
      let keptTransaction = null
      return makeBitcoinAvailable(56)
        .then(() => runRequests(
          postBuyOrder(12, 34),
          postSellOrder(56, 78),
          postBuyOrder(90, 12)
        ))
        .then(bodies => {
          bodies.length.should.equal(3)
          keptTransaction = bodies[1]
          return runRequests(
            postCancelOrder(bodies[0].id),
            postCancelOrder(bodies[2].id)
          )
        })
        .then(getOpenOrders)
        .then(({ body }) => {
          body.length.should.equal(1)
          body[0].should.deep.equal(keptTransaction)
        })
        .then(getAccounts)
        .then(accounts => {
          const account = accounts.get(defaultClientId)
          account.stats.requestCount.should.equal(7)
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
      )).then(() => transactionServiceMock.setTransactions([transaction(1000, 50000)]))
        .then(getAccounts)
        .then(accounts => {
          accounts.get(clientA).balances.should.deep.equal({
            gbp_balance: 94990, gbp_available: 94990, gbp_reserved: 0,
            xbt_balance: 1000, xbt_available: 1000, xbt_reserved: 0
          })
          accounts.get(clientB).balances.should.deep.equal({
            gbp_balance: 94915, gbp_available: 93895, gbp_reserved: 1020,
            xbt_balance: 1000, xbt_available: 1000, xbt_reserved: 0
          })
        })
        .then(() => runRequests(
          postSellOrder(250, 51500, clientA),
          postSellOrder(330, 51600, clientB)
        ))
        .then(() => transactionServiceMock.setTransactions([transaction(220, 52000)]))
        .then(getAccounts)
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
