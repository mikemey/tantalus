/* global describe before beforeEach it */
const moment = require('moment')
const expect = require('chai').expect

const TradeAccount = require('../../backend/simex/tradeAccount')

describe('Trade account', () => {
  const testId = 3242
  let tradeAccount

  beforeEach(() => {
    tradeAccount = TradeAccount(testId, console)
  })

  let transactionId = 1000

  const transaction = (amount, price) => {
    return {
      amount,
      price,
      date: moment.utc().unix(),
      tid: transactionId++
    }
  }

  const balanceProperty = pname => pval => {
    if (pval === undefined) return tradeAccount.getAccount().balances[pname]
    else tradeAccount.getAccount().balances[pname] = pval
  }
  const gbpBalance = balanceProperty('gbp_balance')
  const gbpAvailable = balanceProperty('gbp_available')
  const gbpReserved = balanceProperty('gbp_reserved')
  const xbtBalance = balanceProperty('xbt_balance')
  const xbtAvailable = balanceProperty('xbt_available')
  const xbtReserved = balanceProperty('xbt_reserved')

  describe('buy orders', () => {
    it('start amounts', () => {
      tradeAccount.getAccount().balances.should.deep.equal({
        gbp_balance: 100000, gbp_available: 100000, gbp_reserved: 0,
        xbt_balance: 0, xbt_available: 0, xbt_reserved: 0
      })
    })

    it('reserves gbp amount after buy orders', () => {
      tradeAccount.newBuyOrder(1000, 230000)
      tradeAccount.newBuyOrder(2000, 340000)

      tradeAccount.getOpenOrders().should.have.length(2)
      gbpBalance().should.equal(100000)
      gbpAvailable().should.equal(9000)
      gbpReserved().should.equal(91000)
    })

    it('throws exception when larger volume in order than available', () => {
      gbpAvailable(3230)
      expect(tradeAccount.newBuyOrder.bind(tradeAccount, 5000, 340000))
        .to.throw(Error, 'buying with more volume than available: £ 1700.00 > £ 32.30')

      gbpBalance().should.equal(3230)
      gbpAvailable().should.equal(3230)
      gbpReserved().should.equal(0)
    })
  })

  describe('sell orders', () => {
    it('reserves xbt amount after sell order', () => {
      xbtAvailable(300)
      xbtReserved(100)
      tradeAccount.newSellOrder(146, 230000)
      tradeAccount.newSellOrder(143, 250000)

      tradeAccount.getOpenOrders().should.have.length(2)
      xbtBalance().should.equal(400)
      xbtAvailable().should.equal(11)
      xbtReserved().should.equal(389)
    })

    it('throws exception when larger amount in order than available', () => {
      xbtAvailable(300)
      xbtReserved(100)
      expect(tradeAccount.newSellOrder.bind(tradeAccount, 301, 340000))
        .to.throw(Error, 'selling more btcs than available: Ƀ 0.0301 > Ƀ 0.0300')
      xbtBalance().should.equal(400)
      xbtAvailable().should.equal(300)
      xbtReserved().should.equal(100)
    })
  })

  describe('transactions', () => {
    it('does nothing when no new transactions', () => {
      gbpAvailable(50000)
      xbtAvailable(300)
      tradeAccount.newSellOrder(146, 230000)
      tradeAccount.newBuyOrder(1000, 230000)

      tradeAccount.transactionsUpdate([])
      tradeAccount.getOpenOrders().should.have.length(2)
      gbpAvailable(27000)
      xbtAvailable(154)
    })

    it('resolves buy order when transaction price <= bid price', () => {
      gbpAvailable(50000)
      xbtAvailable(250)
      const unresolvedId = tradeAccount.newBuyOrder(1000, 230000).id
      tradeAccount.newBuyOrder(1000, 230200)
      tradeAccount.transactionsUpdate([
        transaction(1000, 230100)
      ])

      const openOrders = tradeAccount.getOpenOrders()
      openOrders.should.have.length(1)
      openOrders[0].id.should.equal(unresolvedId, 'wrong open order')

      gbpAvailable().should.equal(3980)
      gbpReserved().should.equal(23000)
      xbtAvailable().should.equal(1250)
    })

    it('partially resolves buy order', () => {
      gbpAvailable(50000)
      xbtAvailable(250)
      tradeAccount.newBuyOrder(1000, 230000)
      gbpAvailable().should.equal(27000)
      gbpReserved().should.equal(23000)
      xbtAvailable().should.equal(250)

      tradeAccount.transactionsUpdate([
        transaction(500, 230100),
        transaction(500, 230000),
        transaction(200, 229900)
      ])
      const openOrders = tradeAccount.getOpenOrders()
      openOrders.should.have.length(1)

      gbpAvailable().should.equal(27000)
      gbpReserved().should.equal(6900)
      xbtAvailable().should.equal(950)

      tradeAccount.transactionsUpdate([
        transaction(300, 230000)
      ])
      const openOrders2 = tradeAccount.getOpenOrders()
      openOrders2.should.have.length(0)

      gbpAvailable().should.equal(27000)
      gbpReserved().should.equal(0)
      xbtAvailable().should.equal(1250)
    })

    it('does NOT resolve same transaction twice', () => {
      gbpAvailable(50000)
      xbtAvailable(250)
      const orderId = tradeAccount.newBuyOrder(1000, 234500).id
      const tx = transaction(600, 234500)
      const sameTx = Object.assign({}, tx)

      tradeAccount.transactionsUpdate([tx])
      tradeAccount.transactionsUpdate([
        transaction(600, 235000),
        transaction(100, 234400),
        sameTx
      ])

      const openOrders = tradeAccount.getOpenOrders()
      openOrders.should.have.length(1)
      openOrders[0].id.should.equal(orderId)
      openOrders[0].amount.should.equal(300)

      gbpReserved().should.equal(7035)
      xbtAvailable().should.equal(950)
    })

    it('resolves sell order when transaction price >= asking price', () => {
      gbpAvailable(50000)
      xbtAvailable(1000)
      xbtReserved(1250)
      tradeAccount.newSellOrder(500, 230000)
      const unresolvedId = tradeAccount.newSellOrder(500, 230200).id
      tradeAccount.transactionsUpdate([
        transaction(500, 229900),
        transaction(60, 230000),
        transaction(450, 230100)
      ])

      const openOrders = tradeAccount.getOpenOrders()
      openOrders.should.have.length(1)
      openOrders[0].id.should.equal(unresolvedId, 'wrong open order')

      gbpAvailable().should.equal(61500)
      xbtAvailable().should.equal(0)
      xbtReserved().should.equal(1750)
    })

    it('partially resolves sell order', () => {
      gbpAvailable(50000)
      xbtAvailable(1000)
      xbtReserved(1250)
      tradeAccount.newSellOrder(1000, 230000)

      tradeAccount.transactionsUpdate([
        transaction(300, 230100),
        transaction(500, 230000),
        transaction(200, 229900)
      ])
      const openOrders = tradeAccount.getOpenOrders()
      openOrders.should.have.length(1)
      openOrders[0].amount.should.equal(200)

      gbpAvailable().should.equal(68400)
      xbtAvailable().should.equal(0)
      xbtReserved().should.equal(1450)

      tradeAccount.transactionsUpdate([
        transaction(200, 230000)
      ])
      const openOrders2 = tradeAccount.getOpenOrders()
      openOrders2.should.have.length(0)

      gbpAvailable().should.equal(73000)
      xbtReserved().should.equal(1250)
    })
  })

  describe('cancel orders', () => {
    it('cancels buy order', () => {
      gbpAvailable(50000)
      gbpReserved(12300)

      const orderId = tradeAccount.newBuyOrder(500, 230000).id
      tradeAccount.newBuyOrder(1000, 230200)

      const cancelResult = tradeAccount.cancelOrder(orderId)
      cancelResult.should.equal(true)

      const openOrders = tradeAccount.getOpenOrders()
      openOrders.should.have.length(1)
      openOrders[0].id.should.not.equal(orderId)

      gbpAvailable().should.equal(26980)
      gbpReserved().should.equal(35320)
    })

    it('cancels sell order', () => {
      xbtAvailable(800)
      xbtReserved(300)
      const orderId = tradeAccount.newSellOrder(500, 230000).id
      tradeAccount.newSellOrder(300, 230200)
      tradeAccount.transactionsUpdate([
        transaction(300, 230000)
      ])

      const cancelResult = tradeAccount.cancelOrder(orderId)
      cancelResult.should.equal(true)

      const openOrders = tradeAccount.getOpenOrders()
      openOrders.should.have.length(1)
      openOrders[0].id.should.not.equal(orderId)

      xbtAvailable().should.equal(200)
      xbtReserved().should.equal(600)
    })

    it('ignores repeated transactions', () => {
      gbpAvailable(50000)
      xbtAvailable(250)
      tradeAccount.newBuyOrder(1000, 230200)
      const staticTxs = [transaction(400, 230100)]
      tradeAccount.transactionsUpdate(staticTxs)
      tradeAccount.transactionsUpdate(staticTxs)

      gbpAvailable().should.equal(26980)
      gbpReserved().should.equal(13812)
      xbtAvailable().should.equal(650)
    })
  })
})
