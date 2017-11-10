/* global describe before beforeEach it */
const nock = require('nock')
const moment = require('moment')

const SurgeDetector = require('../../backend/trader/surgeDetector')
const ExchangeConnector = require('../../backend/trader/exchangeConnector')

describe('Surge detector', () => {
  const testHost = 'http://localhost:14149'
  const testId = 2231

  const surgeConfig = {
    clientId: testId,
    exchangeHost: testHost,
    timeslotSeconds: 100,
    buying: {
      ratio: 10, // price change (£/Ƀ) per timeslotSeconds
      useTimeslots: 3
    },
    selling: {
      ratio: -5,
      useTimeslots: 2
    }
  }

  let surgeDetector

  beforeEach(() => {
    const exchange = ExchangeConnector(surgeConfig)
    surgeDetector = SurgeDetector(console, surgeConfig, exchange)
  })

  const expectTrends = (transactions, isPriceSurging, isUnderSellRatio = false) => {
    const scope = nock(testHost).get(`/${testId}/transactions`).reply(200, transactions)
    return surgeDetector.analyseTrends()
      .then(result => {
        scope.isDone().should.equal(true)
        result.should.deep.equal({
          latestPrice: transactions[0].price,
          isPriceSurging, isUnderSellRatio
        })
      })
  }

  it('should ignore empty transactions', () => {
    const scope = nock(testHost).get(`/${testId}/transactions`).reply(200, [])
    return surgeDetector.analyseTrends()
      .then(result => {
        scope.isDone().should.equal(true)
        result.should.deep.equal({
          isPriceSurging: false,
          isUnderSellRatio: false
        })
      })
  })

  describe('BUY ratios', () => {
    it('should detect price surge', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 9, amount: 6765, date: now - 50, price: 553000 },
        // -- timeslot
        { tid: 8, amount: 12254, date: now - 120, price: 551800 },
        { tid: 7, amount: 22454, date: now - 140, price: 552100 },
        { tid: 6, amount: 501, date: now - 199, price: 552300 },
        // -- timeslot should get sorted below
        { tid: 3, amount: 12254, date: now - 399, price: 552000 },
        // -- timeslot
        { tid: 5, amount: 511, date: now - 201, price: 550300 },
        { tid: 4, amount: 3488, date: now - 201, price: 551100 }
      ]

      return expectTrends(transactions, true)
    })

    it('should NOT detect price surge when under limit', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 5, amount: 511, date: now - 10, price: 550300 },
        { tid: 4, amount: 3488, date: now - 99, price: 551100 },
        // -- timeslot
        { tid: 3, amount: 12254, date: now - 101, price: 550000 },
        // -- timeslot
        { tid: 2, amount: 6765, date: now - 250, price: 548000 }
      ]

      return expectTrends(transactions, false)
    })

    it('should NOT detect price surge when timeslot without transactions', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        // -- timeslot
        { tid: 3, amount: 12254, date: now - 101, price: 550000 },
        // -- timeslot
        { tid: 2, amount: 6765, date: now - 250, price: 548000 }
      ]
      return expectTrends(transactions, false)
    })

    it('should NOT detect price surge when older timeslot without transactions', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 3, amount: 12254, date: now - 30, price: 550000 },
        // -- timeslot
        { tid: 2, amount: 6765, date: now - 150, price: 548000 }
        // -- timeslot
      ]
      return expectTrends(transactions, false)
    })

    it('should detect surge after new transactions finishes last timeslot', () => {
      const now = moment().unix()
      const firstTxs = [
        // -- timeslot
        { tid: 9, amount: 765, date: now - 50, price: 552900 },
        // -- timeslot
        { tid: 8, amount: 12254, date: now - 120, price: 551800 },
        { tid: 7, amount: 22454, date: now - 140, price: 552100 },
        { tid: 6, amount: 501, date: now - 199, price: 552300 },
        // -- timeslot
        { tid: 5, amount: 511, date: now - 201, price: 550300 },
        { tid: 4, amount: 3488, date: now - 201, price: 551100 }
      ]
      const secondTxs = [
        // -- timeslot
        { tid: 10, amount: 6765, date: now - 20, price: 553200 },
        { tid: 9, amount: 765, date: now - 50, price: 552900 }
      ]

      return expectTrends(firstTxs, false)
        .then(() => expectTrends(secondTxs, true))
    })
  })

  describe('SELL ratios', () => {
    it('should detect falling under ratio', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 9, amount: 6765, date: now - 50, price: 548800 },
        // -- timeslot
        { tid: 8, amount: 12254, date: now - 120, price: 549400 },
        // -- timeslot should get sorted below
        { tid: 3, amount: 12254, date: now - 280, price: 550000 }
      ]
      return expectTrends(transactions, false, true)
    })

    it('should NOT detect falling under ratio when just over limit', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 9, amount: 6765, date: now - 50, price: 548900 },
        // -- timeslot
        { tid: 8, amount: 12254, date: now - 120, price: 549500 },
        // -- timeslot should get sorted below
        { tid: 3, amount: 12254, date: now - 280, price: 550000 }
      ]
      return expectTrends(transactions, false, false)
    })

    it('should NOT detect falling under ratio when timeslot without transactions', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        // -- timeslot
        { tid: 8, amount: 12254, date: now - 120, price: 549400 },
        // -- timeslot should get sorted below
        { tid: 3, amount: 12254, date: now - 280, price: 550000 }
      ]
      return expectTrends(transactions, false, false)
    })
  })
})
