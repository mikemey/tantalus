/* global describe before beforeEach it */
const nock = require('nock')

const OrderIssuer = require('../../backend/trader/orderIssuer')
const ExchangeConnector = require('../../backend/trader/exchangeConnector')

describe('Order issuer', () => {
  const testHost = 'http://localhost:14147'
  const testClientId = 234
  const testVolumeLimit = 100000
  const testLowerVolumeLimit = 10000
  const testLowerAmountLimit = 500

  const testConfig = {
    clientId: testClientId,
    exchangeHost: testHost,
    buying: {
      volumeLimitPence: testVolumeLimit,
      lowerLimitPence: testLowerVolumeLimit
    },
    selling: {
      lowerLimit_mmBtc: testLowerAmountLimit
    }
  }

  let orderIssuer, openOrdersMock

  const createOpenOrdersMock = () => {
    const receivedOrders = []
    const addOpenOrder = order => {
      receivedOrders.push(order)
    }
    return { addOpenOrder, receivedOrders }
  }

  beforeEach(() => {
    openOrdersMock = createOpenOrdersMock()
    const exchange = ExchangeConnector(testConfig)
    orderIssuer = OrderIssuer(console, testConfig, openOrdersMock, exchange)
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

  describe('buy strategy', () => {
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
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })

    it('should NOT issue a buy order when price not surging (and ignores missing latestPrice)', () => {
      const notSurgingTrend = { isPriceSurging: false }

      return issueOrders(notSurgingTrend)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })

    it('should NOT issue a buy order when latest price is 0', () => {
      throw Error('implement me')
    })
  })

  describe('sell strategy', () => {
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
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })

    it('should NOT issue a sell order when trend is over sell ratio (and ignores missing latestPrice)', () => {
      const overSellRatioTrend = { isUnderSellRatio: false }
      expectGetAccount(createAccountResponse(0, 999))
      return issueOrders(overSellRatioTrend)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })

    it('should NOT issue a sell order when latest price is 0', () => {
      throw Error('implement me')
    })
  })
})
