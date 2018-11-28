const nock = require('nock')
const chai = require('chai')
const should = chai.should()
const expect = chai.expect

const { OrderLogger } = require('../utils/ordersHelper')
const OrderIssuer = require('../trader/orderIssuer')
const ExchangeConnector = require('../trader/exchangeConnector')

describe('Order issuer', () => {
  const testHost = 'http://localhost:14147'
  const testClientId = 234
  const testVolumeLimit = 100000
  const testLowerVolumeLimit = 10000
  const testLowerAmountLimit = 500

  const exchangeConfig = {
    clientId: testClientId,
    exchangeHost: testHost
  }

  const orderIssuerConfig = {
    buying: {
      volumeLimitPence: testVolumeLimit,
      lowerLimitPence: testLowerVolumeLimit
    },
    selling: {
      lowerLimit_mmBtc: testLowerAmountLimit
    }
  }

  let orderIssuer, openOrdersMock
  const logger = OrderLogger(console)

  const createOpenOrdersMock = () => {
    let called = false
    const receivedOrders = []
    const addOpenOrder = order => {
      called = true
      receivedOrders.push(order)
    }
    const hasBeenCalled = () => called
    return { addOpenOrder, receivedOrders, hasBeenCalled }
  }

  beforeEach(() => {
    openOrdersMock = createOpenOrdersMock()
    const exchange = ExchangeConnector(exchangeConfig)
    orderIssuer = OrderIssuer(logger, orderIssuerConfig, openOrdersMock, exchange)
  })

  afterEach(() => nock.cleanAll())

  // order type: (0 - buy; 1 - sell)
  const openOrder = (id, type, amount, price) => { return { id, type, price, amount } }
  const buyOrder = (id, amount, price) => openOrder(id, 0, amount, price)
  const sellOrder = (id, amount, price) => openOrder(id, 1, amount, price)

  const createAccountResponse = (availableVolume, availableAmount) => {
    return {
      balances: {
        gbp_available: availableVolume,
        xbt_available: availableAmount
      }
    }
  }
  const expectGetAccount = (accountResponse) => nock(testHost)
    .get(`/${testClientId}/account`)
    .reply(200, accountResponse)

  const expectBuyOrder = (amount, price, buyResponse) => nock(testHost)
    .post(`/${testClientId}/buy`, { amount, price })
    .reply(200, buyResponse)

  const expectSellOrder = (amount, price, buyResponse) => nock(testHost)
    .post(`/${testClientId}/sell`, { amount, price })
    .reply(200, buyResponse)

  const issueOrders = trends => orderIssuer.issueOrders([trends])

  describe('config checks', () => {
    it('buying volumeLimit', () => {
      const orderIssuerConfig = {
        buying: { lowerLimitPence: testLowerVolumeLimit },
        selling: { lowerLimit_mmBtc: testLowerAmountLimit }
      }
      expect(() => OrderIssuer(logger, orderIssuerConfig, 'openOrdersMock', 'exchange'))
        .to.throw(Error, 'Buy volume limit parameter missing!')
    })

    it('buying lowerLimit', () => {
      const orderIssuerConfig = {
        buying: { volumeLimitPence: testVolumeLimit },
        selling: { lowerLimit_mmBtc: testLowerAmountLimit }
      }
      expect(() => OrderIssuer(logger, orderIssuerConfig, 'openOrdersMock', 'exchange'))
        .to.throw(Error, 'Buy volume lower limit parameter missing!')
    })

    it('selling lowerLimit', () => {
      const orderIssuerConfig = {
        buying: { volumeLimitPence: testVolumeLimit, lowerLimitPence: testLowerVolumeLimit }
      }
      expect(() => OrderIssuer(logger, orderIssuerConfig, 'openOrdersMock', 'exchange'))
        .to.throw(Error, 'Sell volume lower limit parameter missing!')
    })
  })

  describe('(latestPrice)', () => {
    it('should NOT issue an order when latest price is 0', () => {
      const zeroPrice = {
        latestPrice: 0,
        isPriceSurging: true,
        isUnderSellRatio: true
      }
      return issueOrders(zeroPrice)
        .then(() => openOrdersMock.hasBeenCalled().should.equal(false))
    })

    it('should NOT issue an order when latest price is missing', () => {
      const noPrice = { isPriceSurging: true, isUnderSellRatio: true }
      return issueOrders(noPrice)
        .then(() => openOrdersMock.hasBeenCalled().should.equal(false))
    })
  })

  describe('BUY strategy', () => {
    const surgingTrend = (latestPrice = 123) => { return { latestPrice, isPriceSurging: true } }

    const expectBuyCycle = (accountResponse, amount, price) => {
      const exchangeOrderResponse = buyOrder(100, amount, price)

      const accountScope = expectGetAccount(accountResponse)
      const buyScope = expectBuyOrder(amount, price, exchangeOrderResponse)
      return issueOrders(surgingTrend(price))
        .then(() => {
          accountScope.isDone().should.equal(true)
          buyScope.isDone().should.equal(true)
          openOrdersMock.receivedOrders.should.deep.equal([exchangeOrderResponse])
        })
    }

    it('should issue a buy order when price surges', () => {
      return expectBuyCycle(createAccountResponse(30202), 6040, 50000)
    })

    it('should issue a buy order with the maximum allowed volume', () => {
      return expectBuyCycle(createAccountResponse(testVolumeLimit + 1), 200000, 5000)
    })

    it('should NOT issue a buy order when available volume under lower volume limit', () => {
      expectGetAccount(createAccountResponse(testLowerVolumeLimit - 1))
      return issueOrders(surgingTrend(510300))
        .then(() => openOrdersMock.hasBeenCalled().should.equal(false))
    })

    it('should NOT issue a buy order when price not surging (and ignores missing latestPrice)', () => {
      const notSurgingTrend = { isPriceSurging: false }

      return issueOrders(notSurgingTrend)
        .then(() => openOrdersMock.hasBeenCalled().should.equal(false))
    })

    it('should ignore error when exchange response is 409 Conflict', () => {
      const amount = 6040
      const price = 50000
      expectGetAccount(createAccountResponse(30202))
      const buyScope = nock(testHost).post(`/${testClientId}/buy`, { amount, price })
        .reply(409, { message: 'test buy order conflict' })

      return issueOrders(surgingTrend(price))
        .then(() => {
          buyScope.isDone().should.equal(true)
          openOrdersMock.hasBeenCalled().should.equal(false)
        })
    })

    it('should rethrow error when exchange response 400 Bad Request', () => {
      const amount = 6040
      const price = 50000
      expectGetAccount(createAccountResponse(30202))

      const errorResponse = { message: 'test buy order client error' }
      const buyScope = nock(testHost).post(`/${testClientId}/buy`, { amount, price })
        .reply(400, errorResponse)

      return issueOrders(surgingTrend(price))
        .then(() => should.fail('expected exception not thrown!'))
        .catch(err => {
          buyScope.isDone().should.equal(true)
          openOrdersMock.hasBeenCalled().should.equal(false)
          err.statusCode.should.deep.equal(400)
          err.body.should.deep.equal(errorResponse)
        })
    })
  })

  describe('SELL strategy', () => {
    const underSellRatioTrend = (latestPrice = 123) => { return { latestPrice, isUnderSellRatio: true } }

    it('should issue a sell order when trend under sell ratio', () => {
      const amount = 2412
      const price = 3252
      const exchangeOrderResponse = sellOrder(100, amount, price)

      const accountScope = expectGetAccount(createAccountResponse(0, amount))
      const sellScope = expectSellOrder(amount, price, exchangeOrderResponse)
      return issueOrders(underSellRatioTrend(price))
        .then(() => {
          accountScope.isDone().should.equal(true)
          sellScope.isDone().should.equal(true)
          openOrdersMock.receivedOrders.should.deep.equal([exchangeOrderResponse])
        })
    })

    it('should NOT issue a sell order when amount under lower amount limit', () => {
      expectGetAccount(createAccountResponse(0, testLowerAmountLimit - 1))
      return issueOrders(underSellRatioTrend())
        .then(() => openOrdersMock.hasBeenCalled().should.equal(false))
    })

    it('should NOT issue a sell order when trend is over sell ratio (and ignores missing latestPrice)', () => {
      const overSellRatioTrend = { isUnderSellRatio: false }
      expectGetAccount(createAccountResponse(0, 999))
      return issueOrders(overSellRatioTrend)
        .then(() => openOrdersMock.hasBeenCalled().should.equal(false))
    })

    it('should ignore error when exchange response is 409 Conflict', () => {
      const amount = 2412
      const price = 3252
      expectGetAccount(createAccountResponse(0, amount))
      const sellScope = nock(testHost).post(`/${testClientId}/sell`, { amount, price })
        .reply(409, { message: 'test sell order conflict' })

      return issueOrders(underSellRatioTrend(price))
        .then(() => {
          sellScope.isDone().should.equal(true)
          openOrdersMock.hasBeenCalled().should.equal(false)
        })
    })

    it('should rethrow error when exchange response 400 Bad Request', () => {
      const amount = 2412
      const price = 3252
      expectGetAccount(createAccountResponse(0, amount))

      const errorResponse = { message: 'test sell order client error' }
      const sellScope = nock(testHost).post(`/${testClientId}/sell`, { amount, price })
        .reply(400, errorResponse)

      return issueOrders(underSellRatioTrend(price))
        .then(() => should.fail('expected exception not thrown!'))
        .catch(err => {
          sellScope.isDone().should.equal(true)
          openOrdersMock.hasBeenCalled().should.equal(false)
          err.statusCode.should.deep.equal(400)
          err.body.should.deep.equal(errorResponse)
        })
    })
  })
})
