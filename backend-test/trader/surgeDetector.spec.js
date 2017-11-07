/* global describe before beforeEach it */
const moment = require('moment')

const SurgeDetector = require('../../backend/trader/surgeDetector')

describe('Surge detector', () => {
  const surgeConfig = {
    timeslotSeconds: 100,
    buying: {
      ratio: 0.1, // price change per second
      useTimeslots: 3
    },
    selling: {
      ratio: -0.05,
      useTimeslots: 2
    }
  }

  let surgeDetector
  const expectTrend = (transactions, isPriceSurging, isUnderSellRatio = false) => {
    surgeDetector.analyseTrend(transactions).should.deep.equal({ isPriceSurging, isUnderSellRatio })
  }

  beforeEach(() => {
    surgeDetector = SurgeDetector(surgeConfig)
  })

  describe('BUY ratios', () => {
    it('should detect price surge', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 9, amount: '0.6765', date: now - 50, price: 5530 },
        // -- timeslot
        { tid: 8, amount: '1.2254', date: now - 120, price: 5518 },
        { tid: 7, amount: '2.2454', date: now - 140, price: 5521 },
        { tid: 6, amount: '0.0501', date: now - 199, price: 5523 },
        // -- timeslot should get sorted below
        { tid: 3, amount: '1.2254', date: now - 399, price: 5520 },
        // -- timeslot
        { tid: 5, amount: '0.0511', date: now - 201, price: 5503 },
        { tid: 4, amount: '0.3488', date: now - 201, price: 5511 }
      ]

      expectTrend(transactions, true)
    })

    it('should NOT detect price surge when under limit', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 5, amount: '0.0511', date: now - 10, price: 5503 },
        { tid: 4, amount: '0.3488', date: now - 99, price: 5511 },
        // -- timeslot
        { tid: 3, amount: '1.2254', date: now - 101, price: 5500 },
        // -- timeslot
        { tid: 2, amount: '0.6765', date: now - 250, price: 5480 }
      ]

      expectTrend(transactions, false)
    })

    it('should NOT detect price surge when timeslot without transactions', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        // -- timeslot
        { tid: 3, amount: '1.2254', date: now - 101, price: 5500 },
        // -- timeslot
        { tid: 2, amount: '0.6765', date: now - 250, price: 5480 }
      ]
      expectTrend(transactions, false)
    })

    it('should NOT detect price surge when older timeslot without transactions', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 3, amount: '1.2254', date: now - 30, price: 5500 },
        // -- timeslot
        { tid: 2, amount: '0.6765', date: now - 150, price: 5480 }
        // -- timeslot
      ]
      expectTrend(transactions, false)
    })

    it('should detect surge after new transactions finishes last timeslot', () => {
      const now = moment().unix()
      const firstTxs = [
        // -- timeslot
        { tid: 9, amount: '0.0765', date: now - 50, price: 5529 },
        // -- timeslot
        { tid: 8, amount: '1.2254', date: now - 120, price: 5518 },
        { tid: 7, amount: '2.2454', date: now - 140, price: 5521 },
        { tid: 6, amount: '0.0501', date: now - 199, price: 5523 },
        // -- timeslot
        { tid: 5, amount: '0.0511', date: now - 201, price: 5503 },
        { tid: 4, amount: '0.3488', date: now - 201, price: 5511 }
      ]
      const secondTxs = [
        // -- timeslot
        { tid: 10, amount: '0.6765', date: now - 20, price: 5532 },
        { tid: 9, amount: '0.0765', date: now - 50, price: 5529 }
      ]

      expectTrend(firstTxs, false)
      expectTrend(secondTxs, true)
    })
  })

  describe('SELL ratios', () => {
    it('should detect falling under ratio', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 9, amount: '0.6765', date: now - 50, price: 5488 },
        // -- timeslot
        { tid: 8, amount: '1.2254', date: now - 120, price: 5494 },
        // -- timeslot should get sorted below
        { tid: 3, amount: '1.2254', date: now - 280, price: 5500 }
      ]
      expectTrend(transactions, false, true)
    })

    it('should NOT detect falling under ratio when just over limit', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        { tid: 9, amount: '0.6765', date: now - 50, price: 5489 },
        // -- timeslot
        { tid: 8, amount: '1.2254', date: now - 120, price: 5495 },
        // -- timeslot should get sorted below
        { tid: 3, amount: '1.2254', date: now - 280, price: 5500 }
      ]
      expectTrend(transactions, false, false)
    })

    it('should NOT detect falling under ratio when timeslot without transactions', () => {
      const now = moment().unix()
      const transactions = [
        // -- timeslot
        // -- timeslot
        { tid: 8, amount: '1.2254', date: now - 120, price: 5494 },
        // -- timeslot should get sorted below
        { tid: 3, amount: '1.2254', date: now - 280, price: 5500 }
      ]
      expectTrend(transactions, false, false)
    })
  })
})
