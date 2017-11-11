/* global describe before beforeEach it */
const nock = require('nock')
const should = require('chai').should()

const ExchangeConnector = require('../../backend/trader/exchangeConnector')

describe('Exchange connector', () => {
  const testHost = 'http://localhost:14145'
  const testClientId = 234
  const testConfig = {
    clientId: testClientId,
    exchangeHost: testHost
  }

  const exchangeConnector = ExchangeConnector(testConfig)

  afterEach(() => nock.cleanAll())

  it('should request open orders', () => {
    const testData = [{ tid: 3 }, { tid: 2 }]
    const scope = nock(testHost).get(`/${testClientId}/open_orders`).reply(200, testData)

    return exchangeConnector.getOpenOrders()
      .then(orders => {
        scope.isDone().should.equal(true)
        orders.should.deep.equal(testData)
      })
  })

  it('throw expection when open order request fails', () => {
    const scope = nock(testHost).get(`/${testClientId}/open_orders`).twice().reply(404)
    return exchangeConnector.getOpenOrders()
      .then(orders => should.fail('should throw exception'))
      .catch(err => {
        scope.isDone().should.equal(true)
        err.message.should.include('Request error')
        err.message.should.include(`GET ${testHost}/${testClientId}/open_orders`)
      })
  })

  it('should send buy order', () => {
    const amount = 20
    const price = 40
    const orderResponse = { id: 1 }
    const scope = nock(testHost)
      .post(`/${testClientId}/buy`, { amount, price }).reply(200, orderResponse)

    return exchangeConnector.buyLimitOrder(amount, price)
      .then(response => {
        scope.isDone().should.equal(true)
        response.should.deep.equal(orderResponse)
      })
  })

  it('should send sell order', () => {
    const amount = 220
    const price = 420
    const orderResponse = { id: 2 }
    const scope = nock(testHost)
      .post(`/${testClientId}/sell`, { amount, price })
      .reply(200, orderResponse)

    return exchangeConnector.sellLimitOrder(amount, price)
      .then(response => {
        scope.isDone().should.equal(true)
        response.should.deep.equal(orderResponse)
      })
  })

  it('should send cancel order', () => {
    const id = 123
    const success = false
    const scope = nock(testHost)
      .post(`/${testClientId}/cancel_order`, { id })
      .reply(200, `${success}`)

    return exchangeConnector.cancelOrder(id)
      .then(response => {
        scope.isDone().should.equal(true)
        response.should.equal(success)
      })
  })

  it('should request transactions', () => {
    const transactionsList = [{ tid: 1 }, { tid: 2 }]
    const scope = nock(testHost)
      .get('/transactions')
      .reply(200, transactionsList)

    return exchangeConnector.getTransactions()
      .then(transactions => {
        scope.isDone().should.equal(true)
        transactions.should.deep.equal(transactionsList)
      })
  })

  it('should request all accounts', () => {
    const allAccounts = [{ clientId: 1 }, { clientId: 2 }]
    const scope = nock(testHost)
      .get('/accounts')
      .reply(200, allAccounts)

    return exchangeConnector.getAllAccounts()
      .then(accounts => {
        scope.isDone().should.equal(true)
        accounts.should.deep.equal(allAccounts)
      })
  })

  it('should request client account', () => {
    const testAccount = { clientId: 1 }
    const scope = nock(testHost)
      .get(`/${testClientId}/account`)
      .reply(200, testAccount)

    return exchangeConnector.getAccount()
      .then(account => {
        scope.isDone().should.equal(true)
        account.should.deep.equal(testAccount)
      })
  })
})
