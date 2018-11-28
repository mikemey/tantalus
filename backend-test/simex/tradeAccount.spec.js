/* eslint object-property-newline: ["off"] */
const moment = require('moment')
const expect = require('chai').expect

const TradeAccount = require('../../backend/simex/tradeAccount')

describe('Trade account', () => {
  const testClientId = 3242
  let transactionId = 1000

  const transaction = (amount, price) => {
    return {
      amount,
      price,
      date: moment.utc().unix(),
      tid: transactionId++
    }
  }

  const balanceProperty = (pname, prohibitSetter = false) => pval => {
    if (prohibitSetter && pval) throw Error(`setting property ${pname} prohibited`)
    if (pval === undefined) return tradeAccount.getAccount().balances[pname]
    else {
      tradeAccount.account[pname] = pval
    }
  }

  const gbpBalance = balanceProperty('gbp_balance')
  const xbtBalance = balanceProperty('xbt_balance')

  const gbpAvailable = balanceProperty('gbp_available', true)
  const xbtAvailable = balanceProperty('xbt_available', true)

  const gbpReserved = reserveGbp => {
    if (reserveGbp === undefined) return balanceProperty('gbp_reserved')()
    setupOrders.push(tradeAccount.newBuyOrder(reserveGbp, 10000))
  }

  const xbtReserved = reserveXbt => {
    if (reserveXbt === undefined) return balanceProperty('xbt_reserved')()
    setupOrders.push(tradeAccount.newSellOrder(reserveXbt, 10000000))
  }
  let tradeAccount, setupOrders

  beforeEach(() => {
    tradeAccount = TradeAccount(console, testClientId)
    setupOrders = []
  })

  const getOpenOrdersFromTest = () => tradeAccount
    .getOpenOrders()
    .filter(oo => undefined === setupOrders.find(so => so.id === oo.id))

  describe('buy orders', () => {
    it('trader stats and start balances', () => {
      const account = tradeAccount.getAccount()
      account.clientId.should.equal(testClientId)
      tradeAccount.getAccount().balances.should.deep.equal({
        gbp_balance: 100000, gbp_available: 100000, gbp_reserved: 0,
        xbt_balance: 0, xbt_available: 0, xbt_reserved: 0
      })
    })

    it('overwrites start balance', () => {
      tradeAccount = TradeAccount(console, testClientId, 500)
      tradeAccount.getAccount().balances.should.deep.equal({
        gbp_balance: 500, gbp_available: 500, gbp_reserved: 0,
        xbt_balance: 0, xbt_available: 0, xbt_reserved: 0
      })
    })

    it('reserves gbp amount after buy orders', () => {
      tradeAccount.newBuyOrder(1000, 230000)
      tradeAccount.newBuyOrder(2000, 340000)

      getOpenOrdersFromTest().should.have.length(2)
      gbpBalance().should.equal(100000)
      gbpAvailable().should.equal(9000)
      gbpReserved().should.equal(91000)
    })

    it('throws exception when larger volume in order than available', () => {
      gbpBalance(3230)
      expect(() => tradeAccount.newBuyOrder(951, 34000))
        .to.throw(Error, 'buying with more volume than available: £ 32.33 > £ 32.30')

      gbpBalance().should.equal(3230)
      gbpAvailable().should.equal(3230)
      gbpReserved().should.equal(0)
    })

    it('ignores repeated transactions', () => {
      gbpBalance(50000)
      xbtBalance(250)
      tradeAccount.newBuyOrder(1000, 230200)
      const staticTxs = [transaction(400, 230100)]
      tradeAccount.transactionsUpdate(staticTxs)
      tradeAccount.transactionsUpdate(staticTxs)

      gbpBalance().should.equal(40792)
      gbpAvailable().should.equal(26980)
      gbpReserved().should.equal(13812)
      xbtAvailable().should.equal(650)
    })
  })

  describe('sell orders', () => {
    it('reserves xbt amount after sell order', () => {
      xbtBalance(400)
      xbtReserved(100)
      tradeAccount.newSellOrder(146, 230000)
      tradeAccount.newSellOrder(143, 250000)

      getOpenOrdersFromTest().should.have.length(2)
      xbtBalance().should.equal(400)
      xbtAvailable().should.equal(11)
      xbtReserved().should.equal(389)
    })

    it('throws exception when larger amount in order than available', () => {
      xbtBalance(400)
      xbtReserved(100)
      expect(() => tradeAccount.newSellOrder(301, 340000))
        .to.throw(Error, 'selling more btcs than available: Ƀ 0.0301 > Ƀ 0.0300')
      xbtBalance().should.equal(400)
      xbtAvailable().should.equal(300)
      xbtReserved().should.equal(100)
    })
  })

  describe('transactions', () => {
    it('does nothing when no new transactions', () => {
      gbpBalance(50000)
      xbtBalance(300)
      tradeAccount.newSellOrder(146, 230000)
      tradeAccount.newBuyOrder(1000, 230000)

      tradeAccount.transactionsUpdate([])
      getOpenOrdersFromTest().should.have.length(2)
      gbpAvailable().should.equal(27000)
      xbtAvailable().should.equal(154)
    })

    it('resolves buy order when transaction.price <= bid.price', () => {
      gbpBalance(50000)
      xbtBalance(250)
      const unresolvedId = tradeAccount.newBuyOrder(1000, 230100).id
      tradeAccount.newBuyOrder(1000, 230300)
      tradeAccount.transactionsUpdate([
        transaction(1000, 230200)
      ])

      const openOrders = getOpenOrdersFromTest()
      openOrders.should.have.length(1)
      openOrders[0].id.should.equal(unresolvedId, 'wrong open order')

      gbpAvailable().should.equal(3960)
      gbpReserved().should.equal(23010)
      xbtAvailable().should.equal(1250)
    })

    it('partially resolves buy order', () => {
      gbpBalance(50000)
      xbtBalance(250)
      tradeAccount.newBuyOrder(1000, 229900)
      gbpBalance().should.equal(50000)
      gbpAvailable().should.equal(27010)
      gbpReserved().should.equal(22990)
      xbtAvailable().should.equal(250)

      tradeAccount.transactionsUpdate([
        transaction(500, 230000),
        transaction(500, 229900),
        transaction(200, 229800)
      ])
      const openOrders = getOpenOrdersFromTest()
      openOrders.should.have.length(1)

      gbpBalance().should.equal(33907)
      gbpAvailable().should.equal(27010)
      gbpReserved().should.equal(6897)
      xbtAvailable().should.equal(950)

      tradeAccount.transactionsUpdate([
        transaction(300, 229900)
      ])
      const openOrders2 = getOpenOrdersFromTest()
      openOrders2.should.have.length(0)

      gbpBalance().should.equal(27010)
      gbpAvailable().should.equal(27010)
      gbpReserved().should.equal(0)
      xbtAvailable().should.equal(1250)
    })

    it('does NOT resolve same transaction twice', () => {
      gbpBalance(50000)
      xbtBalance(250)
      const orderId = tradeAccount.newBuyOrder(1000, 234500).id
      const tx = transaction(600, 234500)
      const sameTx = Object.assign({}, tx)

      tradeAccount.transactionsUpdate([tx])
      tradeAccount.transactionsUpdate([
        transaction(600, 235000),
        transaction(100, 234400),
        sameTx
      ])

      const openOrders = getOpenOrdersFromTest()
      openOrders.should.have.length(1)
      openOrders[0].id.should.equal(orderId)
      openOrders[0].amount.should.equal(300)

      gbpReserved().should.equal(7035)
      xbtAvailable().should.equal(950)
    })

    it('resolves sell order when transaction price >= asking price', () => {
      gbpBalance(50000)
      xbtBalance(2250)
      xbtReserved(1250)
      tradeAccount.newSellOrder(500, 230000)
      const unresolvedId = tradeAccount.newSellOrder(500, 230200).id
      tradeAccount.transactionsUpdate([
        transaction(500, 229900),
        transaction(60, 230000),
        transaction(450, 230100)
      ])

      const openOrders = getOpenOrdersFromTest()
      openOrders.should.have.length(1)
      openOrders[0].id.should.equal(unresolvedId, 'wrong open order')

      gbpAvailable().should.equal(61500)
      xbtAvailable().should.equal(0)
      xbtReserved().should.equal(1750)
    })

    it('partially resolves sell order', () => {
      gbpBalance(50000)
      xbtBalance(3800)
      xbtReserved(1250)
      tradeAccount.newSellOrder(1000, 231100)

      tradeAccount.transactionsUpdate([
        transaction(333, 231200),
        transaction(111, 231100),
        transaction(1000, 231000)
      ])

      const openOrders = getOpenOrdersFromTest()
      openOrders.should.have.length(1)
      openOrders[0].amount.should.equal(556)

      gbpAvailable().should.equal(60261)
      xbtBalance().should.equal(3356)
      xbtAvailable().should.equal(1550)
      xbtReserved().should.equal(1806)

      tradeAccount.transactionsUpdate([
        transaction(560, 231100)
      ])
      const openOrders2 = getOpenOrdersFromTest()
      openOrders2.should.have.length(0)

      gbpAvailable().should.equal(73110)
      xbtBalance().should.equal(2800)
      xbtAvailable().should.equal(1550)
      xbtReserved().should.equal(1250)
    })
  })

  describe('cancel orders', () => {
    it('cancels buy order', () => {
      gbpBalance(62300)
      gbpReserved(12300)

      const orderId = tradeAccount.newBuyOrder(500, 230000).id
      const unboughtId = tradeAccount.newBuyOrder(1000, 230200).id

      const cancelResult = tradeAccount.cancelOrder(orderId)
      cancelResult.should.equal(true)

      const openOrders = getOpenOrdersFromTest()
      openOrders.should.have.length(1)
      openOrders[0].id.should.equal(unboughtId)

      gbpAvailable().should.equal(26980)
      gbpReserved().should.equal(35320)
    })

    it('cancels partially bought order', () => {
      gbpBalance(62300)
      gbpReserved(12300)
      const orderId = tradeAccount.newBuyOrder(500, 230100).id

      tradeAccount.transactionsUpdate([
        transaction(300, 230200),
        transaction(110, 230100),
        transaction(220, 230000)
      ])
      xbtAvailable().should.equal(330)
      gbpBalance().should.equal(54707)
      gbpAvailable().should.equal(38495)
      gbpReserved().should.equal(16212)

      tradeAccount.cancelOrder(orderId)
      gbpBalance().should.equal(54707)
      gbpAvailable().should.equal(42407)
      gbpReserved().should.equal(12300)
    })

    it('cancels sell order', () => {
      xbtBalance(1100)
      xbtReserved(300)
      const orderId = tradeAccount.newSellOrder(500, 230000).id
      const unsoldId = tradeAccount.newSellOrder(300, 230200).id
      tradeAccount.transactionsUpdate([
        transaction(300, 230000)
      ])

      const cancelResult = tradeAccount.cancelOrder(orderId)
      cancelResult.should.equal(true)

      const openOrders = getOpenOrdersFromTest()
      openOrders.should.have.length(1)
      openOrders[0].id.should.equal(unsoldId)

      xbtAvailable().should.equal(200)
      xbtReserved().should.equal(600)
    })

    it('cancels partially sold order', () => {
      gbpBalance(0)
      xbtBalance(1600)
      const orderId = tradeAccount.newSellOrder(500, 335300).id
      tradeAccount.transactionsUpdate([transaction(300, 335500)])

      gbpAvailable().should.equal(10059)
      xbtBalance().should.equal(1300)
      xbtAvailable().should.equal(1100)
      xbtReserved().should.equal(200)

      tradeAccount.cancelOrder(orderId)
      xbtBalance().should.equal(1300)
      xbtAvailable().should.equal(1300)
      xbtReserved().should.equal(0)
    })
  })
})
