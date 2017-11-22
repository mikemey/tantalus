/* global describe before beforeEach it */
const sinon = require('sinon')
const chai = require('chai')
const expect = chai.expect

const { OrderLogger } = require('../../backend/utils/ordersHelper')
const OrderIssuer = require('../../backend/trader/orderIssuer')

describe('Synced order issuer', () => {
  const testVolumeLimit = 100000
  const testLowerVolumeLimit = 10000
  const testLowerAmountLimit = 500

  const orderIssuerConfig = {
    syncedMode: true,
    buying: {
      volumeLimitPence: testVolumeLimit,
      lowerLimitPence: testLowerVolumeLimit
    },
    selling: {
      lowerLimit_mmBtc: testLowerAmountLimit
    }
  }

  const ExchangeMock = () => {
    return {
      buyLimitOrder: sinon.stub(),
      sellLimitOrder: sinon.stub(),
      getAccount: sinon.stub()
    }
  }

  const OpenOrdersMock = () => {
    return {
      addOpenOrder: sinon.stub()
    }
  }

  let orderIssuer, openOrdersMock, exchangeMock
  const logger = OrderLogger(console)

  beforeEach(() => {
    openOrdersMock = OpenOrdersMock()
    exchangeMock = ExchangeMock()
    orderIssuer = OrderIssuer(logger, orderIssuerConfig, openOrdersMock, exchangeMock)
  })

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

  const issueOrders = trends => orderIssuer.issueOrders([trends])

  describe('config checks', () => {
    it('buying volumeLimit', () => {
      const orderIssuerConfig = {
        buying: { lowerLimitPence: testLowerVolumeLimit },
        selling: { lowerLimit_mmBtc: testLowerAmountLimit }
      }
      expect(() => OrderIssuer(logger, orderIssuerConfig, 'openOrdersMock', 'exchangeMock'))
        .to.throw(Error, 'Buy volume limit parameter missing!')
    })

    it('buying lowerLimit', () => {
      const orderIssuerConfig = {
        buying: { volumeLimitPence: testVolumeLimit },
        selling: { lowerLimit_mmBtc: testLowerAmountLimit }
      }
      expect(() => OrderIssuer(logger, orderIssuerConfig, 'openOrdersMock', 'exchangeMock'))
        .to.throw(Error, 'Buy volume lower limit parameter missing!')
    })

    it('selling lowerLimit', () => {
      const orderIssuerConfig = {
        buying: { volumeLimitPence: testVolumeLimit, lowerLimitPence: testLowerVolumeLimit }
      }
      expect(() => OrderIssuer(logger, orderIssuerConfig, 'openOrdersMock', 'exchangeMock'))
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
      issueOrders(zeroPrice)
      openOrdersMock.addOpenOrder.called.should.equal(false)
    })

    it('should NOT issue an order when latest price is missing', () => {
      const noPrice = { isPriceSurging: true, isUnderSellRatio: true }
      issueOrders(noPrice)
      openOrdersMock.addOpenOrder.called.should.equal(false)
    })
  })

  describe('BUY strategy', () => {
    const surgingTrend = (latestPrice = 123) => { return { latestPrice, isPriceSurging: true } }

    const expectBuyCycle = (accountResponse, amount, price) => {
      const exchangeOrderResponse = buyOrder(100, amount, price)

      exchangeMock.getAccount.returns(accountResponse)
      exchangeMock.buyLimitOrder.withArgs(amount, price).returns(exchangeOrderResponse)

      issueOrders(surgingTrend(price))
      exchangeMock.getAccount.called.should.equal(true, 'getAccount not called')
      exchangeMock.buyLimitOrder.withArgs(amount, price).called.should.equal(true, 'buyLimitOrder not called')
      openOrdersMock.addOpenOrder.withArgs(exchangeOrderResponse).called.should.equal(true)
    }

    it('should issue a buy order when price surges', () => {
      return expectBuyCycle(createAccountResponse(30202), 6040, 50000)
    })

    it('should issue a buy order with the maximum allowed volume', () => {
      return expectBuyCycle(createAccountResponse(testVolumeLimit + 1), 200000, 5000)
    })

    it('should NOT issue a buy order when available volume under lower volume limit', () => {
      exchangeMock.getAccount.returns(createAccountResponse(testLowerVolumeLimit - 1))
      issueOrders(surgingTrend(510300))
      openOrdersMock.addOpenOrder.called.should.equal(false)
    })

    it('should NOT issue a buy order when price not surging (and ignores missing latestPrice)', () => {
      const notSurgingTrend = { isPriceSurging: false }

      issueOrders(notSurgingTrend)
      openOrdersMock.addOpenOrder.called.should.equal(false)
    })
  })

  describe('SELL strategy', () => {
    const underSellRatioTrend = (latestPrice = 123) => { return { latestPrice, isUnderSellRatio: true } }

    it('should issue a sell order when trend under sell ratio', () => {
      const amount = 2412
      const price = 3252
      const exchangeOrderResponse = sellOrder(100, amount, price)

      exchangeMock.getAccount.returns(createAccountResponse(0, amount))
      exchangeMock.sellLimitOrder.withArgs(amount, price).returns(exchangeOrderResponse)

      issueOrders(underSellRatioTrend(price))
      exchangeMock.getAccount.called.should.equal(true, 'getAccount not called')
      exchangeMock.sellLimitOrder.withArgs(amount, price).called.should.equal(true, 'sellLimitOrder not called')
      openOrdersMock.addOpenOrder.withArgs(exchangeOrderResponse).called.should.equal(true)
    })

    it('should NOT issue a sell order when amount under lower amount limit', () => {
      exchangeMock.getAccount.returns(createAccountResponse(0, testLowerAmountLimit - 1))
      issueOrders(underSellRatioTrend())
      openOrdersMock.addOpenOrder.called.should.equal(false)
    })

    it('should NOT issue a sell order when trend is over sell ratio (and ignores missing latestPrice)', () => {
      const overSellRatioTrend = { isUnderSellRatio: false }
      exchangeMock.getAccount.returns(createAccountResponse(0, 999))

      issueOrders(overSellRatioTrend)
      openOrdersMock.addOpenOrder.called.should.equal(false)
    })
  })
})
