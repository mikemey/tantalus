/* global describe before beforeEach it */
const nock = require('nock')
const moment = require('moment')

const SurgeDetector = require('../../backend/trader/surgeDetector')
const ExchangeConnector = require('../../backend/trader/exchangeConnector')

describe('Surge detector', () => {
  const testHost = 'http://localhost:14149'

  const surgeConfig = {
    clientId: 2231,
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

  let surgeDetector, testTimer

  const TestTimer = () => {
    let override = 0
    return {
      unixTime: () => override || moment.utc().unix(),
      setTime: newTime => { override = newTime }
    }
  }

  const testTime = () => testTimer.unixTime()

  beforeEach(() => {
    const exchange = ExchangeConnector(surgeConfig)
    testTimer = TestTimer()
    surgeDetector = SurgeDetector(console, surgeConfig, exchange, testTimer.unixTime)
  })

  afterEach(() => nock.cleanAll())

  const analyseTrends = transactions => {
    const scope = nock(testHost).get('/transactions').reply(200, transactions)
    return surgeDetector.analyseTrends()
      .then(result => {
        scope.isDone().should.equal(true)
        return result
      })
  }

  describe('latest price', () => {
    it('should ignore empty transactions', () => {
      return analyseTrends([]).then(result => {
        result.should.deep.equal({
          latestPrice: 0,
          isPriceSurging: false,
          isUnderSellRatio: false
        })
      })
    })

    it('should use even out of date exchange transaction', () => {
      return analyseTrends([
        { tid: 9, amount: 6765, date: testTime() - 301, price: 11000 }
      ]).then(result => {
        result.should.deep.equal({
          latestPrice: 11000,
          isPriceSurging: false,
          isUnderSellRatio: false
        })
      })
    })

    it('should keep previous price when transactions gets out of date', () => {
      const firstRunDate = 1510590812
      const secondRunDate = firstRunDate + 100

      testTimer.setTime(firstRunDate)
      return analyseTrends([
        { tid: 9, amount: 6765, date: firstRunDate - 250, price: 1111 }
      ])
        .then(result => result.should.deep.equal({
          latestPrice: 1111,
          isPriceSurging: false,
          isUnderSellRatio: false
        }))
        .then(() => {
          testTimer.setTime(secondRunDate)
          return analyseTrends([])
        })
        .then(result => result.should.deep.equal({
          latestPrice: 1111,
          isPriceSurging: false,
          isUnderSellRatio: false
        }))
    })
  })

  describe('BUY ratios', () => {
    it('should detect price surge', () => {
      return analyseTrends([
        // -- timeslot
        { tid: 9, amount: 6765, date: testTime() - 50, price: 553000 },
        // -- timeslot unsorted
        { tid: 6, amount: 501, date: testTime() - 199, price: 552300 },
        { tid: 7, amount: 22454, date: testTime() - 140, price: 552100 },
        { tid: 8, amount: 12254, date: testTime() - 120, price: 551800 },
        // -- timeslot should get sorted below
        { tid: 3, amount: 12254, date: testTime() - 399, price: 552000 },
        // -- timeslot
        { tid: 5, amount: 511, date: testTime() - 201, price: 550300 },
        { tid: 4, amount: 3488, date: testTime() - 201, price: 551100 }
      ]).then(result => result.should.deep.equal({
        latestPrice: 553000,
        isPriceSurging: true,
        isUnderSellRatio: false
      }))
    })

    it('should NOT detect price surge when under limit', () => {
      return analyseTrends([
        // -- timeslot
        { tid: 5, amount: 511, date: testTime() - 10, price: 550300 },
        { tid: 4, amount: 3488, date: testTime() - 99, price: 551100 },
        // -- timeslot
        { tid: 3, amount: 12254, date: testTime() - 101, price: 550000 },
        // -- timeslot
        { tid: 2, amount: 6765, date: testTime() - 250, price: 548000 }
      ]).then(result => result.should.deep.equal({
        latestPrice: 550300,
        isPriceSurging: false,
        isUnderSellRatio: false
      }))
    })

    it('should NOT detect price surge when timeslot without transactions', () => {
      return analyseTrends([
        // -- timeslot
        // -- timeslot
        { tid: 3, amount: 12254, date: testTime() - 101, price: 550000 },
        // -- timeslot
        { tid: 2, amount: 6765, date: testTime() - 250, price: 548000 }
      ]).then(result => result.should.deep.equal({
        latestPrice: 550000,
        isPriceSurging: false,
        isUnderSellRatio: false
      }))
    })

    it('should NOT detect price surge when older timeslot without transactions', () => {
      return analyseTrends([
        // -- timeslot
        { tid: 3, amount: 12254, date: testTime() - 30, price: 550000 },
        // -- timeslot
        { tid: 2, amount: 6765, date: testTime() - 150, price: 548000 }
        // -- timeslot
      ]).then(result => result.should.deep.equal({
        latestPrice: 550000,
        isPriceSurging: false,
        isUnderSellRatio: false
      }))
    })

    it('should detect surge after new transactions finishes last timeslot', () => {
      return analyseTrends([
        // -- timeslot
        { tid: 9, amount: 765, date: testTime() - 50, price: 552900 },
        // -- timeslot
        { tid: 8, amount: 12254, date: testTime() - 120, price: 551800 },
        { tid: 7, amount: 22454, date: testTime() - 140, price: 552100 },
        { tid: 6, amount: 501, date: testTime() - 199, price: 552300 },
        // -- timeslot
        { tid: 5, amount: 511, date: testTime() - 201, price: 550300 },
        { tid: 4, amount: 3488, date: testTime() - 201, price: 551100 }
      ]).then(result => result.should.deep.equal({
        latestPrice: 552900,
        isPriceSurging: false,
        isUnderSellRatio: false
      }))
        .then(() => analyseTrends([
          // -- timeslot
          { tid: 10, amount: 6765, date: testTime() - 20, price: 553200 },
          { tid: 9, amount: 765, date: testTime() - 50, price: 552900 }
        ]))
        .then(result => result.should.deep.equal({
          latestPrice: 553200,
          isPriceSurging: true,
          isUnderSellRatio: false
        }))
    })
  })

  describe('SELL ratios', () => {
    it('should detect falling under ratio', () => {
      return analyseTrends([
        // -- timeslot
        { tid: 9, amount: 6765, date: testTime() - 50, price: 548800 },
        // -- timeslot
        { tid: 8, amount: 12254, date: testTime() - 120, price: 549400 },
        // -- timeslot should get sorted below
        { tid: 3, amount: 12254, date: testTime() - 280, price: 550000 }
      ]).then(result => result.should.deep.equal({
        latestPrice: 548800,
        isPriceSurging: false,
        isUnderSellRatio: true
      }))
    })

    it('should NOT detect falling under ratio when just over limit', () => {
      return analyseTrends([
        // -- timeslot
        { tid: 9, amount: 6765, date: testTime() - 50, price: 549000 },
        // -- timeslot
        { tid: 8, amount: 12254, date: testTime() - 120, price: 549500 },
        // -- timeslot
        { tid: 3, amount: 12254, date: testTime() - 280, price: 550000 }
      ]).then(result => result.should.deep.equal({
        latestPrice: 549000,
        isPriceSurging: false,
        isUnderSellRatio: false
      }))
    })

    it('should NOT detect falling under ratio when timeslot without transactions', () => {
      return analyseTrends([
        // -- timeslot
        // -- timeslot
        { tid: 8, amount: 12254, date: testTime() - 120, price: 549400 },
        // -- timeslot should get sorted below
        { tid: 3, amount: 12254, date: testTime() - 280, price: 550000 }
      ]).then(result => result.should.deep.equal({
        latestPrice: 549400,
        isPriceSurging: false,
        isUnderSellRatio: false
      }))
    })
  })
})
