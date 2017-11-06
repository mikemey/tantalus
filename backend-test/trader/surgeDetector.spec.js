/* global describe before beforeEach it */
const moment = require('moment')
require('chai').should()

const SurgeDetector = require('../../backend/trader/surgeDetector')

describe('Search detector', () => {
  const surgeConfig = {
    timeslotSeconds: 100,
    buying: {
      ratio: 0.1, // price change per second
      timeslotCount: 3
    },
    selling: {
      ratio: -0.05
    }
  }

  let surgeDetector
  beforeEach(() => {
    surgeDetector = SurgeDetector(console, surgeConfig)
  })

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

    surgeDetector.analyse(transactions).isPriceSurging.should.equal(true)
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

    surgeDetector.analyse(transactions).isPriceSurging.should.equal(false)
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
    surgeDetector.analyse(transactions).isPriceSurging.should.equal(false)
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
    surgeDetector.analyse(transactions).isPriceSurging.should.equal(false)
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

    surgeDetector.analyse(firstTxs).isPriceSurging.should.equal(false)
    surgeDetector.analyse(secondTxs).isPriceSurging.should.equal(true)
  })
})
