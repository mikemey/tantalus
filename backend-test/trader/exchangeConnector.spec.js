/* global describe before beforeEach it */
const nock = require('nock')
const should = require('chai').should()

const ExchangeConnector = require('../../backend/trader/exchangeConnector')

describe('Exchange connector', () => {
  const testHost = 'http://localhost:14145'
  const testId = 234
  const testConfig = {
    clientId: testId,
    exchangeHost: testHost
  }

  const exchangeConnector = ExchangeConnector(testConfig)

  afterEach(() => nock.cleanAll())

  it('should request open orders', () => {
    const testData = [{ tid: 3 }, { tid: 2 }]
    const scope = nock(testHost).get(`/${testId}/open_orders`).reply(200, testData)

    return exchangeConnector.getOpenOrders()
      .then(orders => {
        scope.isDone().should.equal(true)
        orders.should.deep.equal(testData)
      })
  })

  it('throw expection when open order request fails', () => {
    const scope = nock(testHost).get(`/${testId}/open_orders`).twice().reply(404)
    return exchangeConnector.getOpenOrders()
      .then(orders => should.fail('should throw exception'))
      .catch(err => {
        scope.isDone().should.equal(true)
        err.message.should.include('Request error')
        err.message.should.include('404')
      })
  })

  it('should send buy order', () => {
    const amount = 20
    const price = 40
    const orderResponse = { id: 1 }
    const scope = nock(testHost)
      .post(`/${testId}/buy`, { amount, price }).reply(200, orderResponse)

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
      .post(`/${testId}/sell`, { amount, price })
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
      .post(`/${testId}/cancel_order`, { id })
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
      .get(`/${testId}/transactions`)
      .reply(200, transactionsList)

    return exchangeConnector.getTransactions()
      .then(transactions => {
        scope.isDone().should.equal(true)
        transactions.should.deep.equal(transactionsList)
      })
  })
})
