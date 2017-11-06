/* global describe before beforeEach it */
const nock = require('nock')
const should = require('chai').should()

const SimExchangeConnector = require('../../backend/trader/simExchangeConnector')

describe('Simulation Exchange connector', () => {
  const testHost = 'http://localhost:14145'
  const testId = 234

  const simExchangeConnector = SimExchangeConnector(testHost, testId)

  afterEach(() => nock.cleanAll())

  it('should request open orders', () => {
    const testData = [{ tid: 3 }, { tid: 2 }]
    nock(testHost).get(`/${testId}/open_orders`).reply(200, testData)

    return simExchangeConnector.getOpenOrders()
      .then(orders => orders.should.deep.equal(testData))
  })

  it('throw expection when open order request fails', () => {
    nock(testHost).get(`/${testId}/open_orders`).twice().reply(404)
    return simExchangeConnector.getOpenOrders()
      .then(orders => should.fail('should throw exception'))
      .catch(err => err.message.should.include('response error'))
  })

  it('should send buy order', () => {
    const amount = 20
    const price = 40
    const orderResponse = { id: 1 }
    nock(testHost).post(`/${testId}/buy`, {
      amount, price
    }).reply(200, orderResponse)

    return simExchangeConnector.buyLimitOrder(amount, price)
      .then(response => response.should.deep.equal(orderResponse))
  })

  it('should send sell order', () => {
    const amount = 220
    const price = 420
    const orderResponse = { id: 2 }
    nock(testHost).post(`/${testId}/sell`, {
      amount, price
    }).reply(200, orderResponse)

    return simExchangeConnector.sellLimitOrder(amount, price)
      .then(response => response.should.deep.equal(orderResponse))
  })

  it('should send cancel order', () => {
    const id = 123
    const success = false
    nock(testHost).post(`/${testId}/cancel_order`, { id }).reply(200, `${success}`)

    return simExchangeConnector.cancelOrder(id)
      .then(response => response.should.equal(success))
  })
})
