const nock = require('nock')

const expect = require('chai').expect

const { TantalusLogger } = require('../utils/tantalusLogger')
const ExchangeConnector = require('../trader/exchangeConnector')
const SurgeDetector = require('../trader/surgeDetector')

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

  const logger = TantalusLogger(console, 'SURGE-TEST')

  let surgeDetector

  describe('(valid config)', () => {
    beforeEach(() => {
      const exchange = ExchangeConnector(surgeConfig)
      surgeDetector = SurgeDetector(logger, surgeConfig, exchange)
    })

    afterEach(() => nock.cleanAll())

    const analyseTrends = (unixTime, transactions) => {
      const scope = nock(testHost).get('/transactions').reply(200, transactions)
      return surgeDetector.analyseTrends(unixTime)
        .then(result => {
          scope.isDone().should.equal(true)
          return result
        })
    }

    const EMPTY_RATIOS = [0, 0]
    const testTime = 1510532327

    const expectResults = (expectedTrends, expectedRatios = EMPTY_RATIOS) => actualTrends => {
      actualTrends.should.deep.equal(expectedTrends)
      surgeDetector.getLatestRatios().should.deep.equal(expectedRatios)
    }

    describe('latest price', () => {
      it('should ignore empty transactions', () => {
        return analyseTrends(testTime, []).then(expectResults({
          latestPrice: 0,
          isPriceSurging: false,
          isUnderSellRatio: false
        }))
      })

      it('should use even out of date exchange transaction', () => {
        return analyseTrends(testTime, [
          { tid: 9, amount: 6765, date: testTime - 301, price: 11000 }
        ]).then(expectResults({
          latestPrice: 11000,
          isPriceSurging: false,
          isUnderSellRatio: false
        }))
      })

      it('should keep previous price when transactions gets out of date', () => {
        const secondRunDate = testTime + 100
        return analyseTrends(testTime, [
          { tid: 9, amount: 6765, date: testTime - 250, price: 1111 }
        ])
          .then(expectResults({
            latestPrice: 1111,
            isPriceSurging: false,
            isUnderSellRatio: false
          }))
          .then(() => analyseTrends(secondRunDate, []))
          .then(expectResults({
            latestPrice: 1111,
            isPriceSurging: false,
            isUnderSellRatio: false
          }))
      })
    })

    describe('BUY ratios', () => {
      it('should detect price surge', () => {
        return analyseTrends(testTime, [
          // -- timeslot
          { tid: 9, amount: 6765, date: testTime - 50, price: 553000 },
          // -- timeslot unsorted
          { tid: 6, amount: 501, date: testTime - 199, price: 552300 },
          { tid: 7, amount: 22454, date: testTime - 140, price: 552100 },
          { tid: 8, amount: 12254, date: testTime - 120, price: 551800 },
          // -- timeslot should get sorted below
          { tid: 3, amount: 12254, date: testTime - 399, price: 552000 },
          // -- timeslot
          { tid: 5, amount: 511, date: testTime - 201, price: 550300 },
          { tid: 4, amount: 3488, date: testTime - 201, price: 551100 }
        ]).then(expectResults({
          latestPrice: 553000,
          isPriceSurging: true,
          isUnderSellRatio: false
        }, [10.02, 10]))
      })

      it('should NOT detect price surge when under limit', () => {
        return analyseTrends(testTime, [
          // -- timeslot
          { tid: 5, amount: 511, date: testTime - 10, price: 550300 },
          { tid: 4, amount: 3488, date: testTime - 99, price: 551100 },
          // -- timeslot
          { tid: 3, amount: 12254, date: testTime - 101, price: 550000 },
          // -- timeslot
          { tid: 2, amount: 6765, date: testTime - 250, price: 548000 }
        ]).then(expectResults({
          latestPrice: 550300,
          isPriceSurging: false,
          isUnderSellRatio: false
        }, [9.98, 20]))
      })

      it('should NOT detect price surge when timeslot without transactions', () => {
        return analyseTrends(testTime, [
          // -- timeslot
          // -- timeslot
          { tid: 3, amount: 12254, date: testTime - 101, price: 550000 },
          // -- timeslot
          { tid: 2, amount: 6765, date: testTime - 250, price: 548000 }
        ]).then(expectResults({
          latestPrice: 550000,
          isPriceSurging: false,
          isUnderSellRatio: false
        }, [0, 20]))
      })

      it('should NOT detect price surge when older timeslot without transactions', () => {
        return analyseTrends(testTime, [
          // -- timeslot
          { tid: 3, amount: 12254, date: testTime - 30, price: 550000 },
          // -- timeslot
          { tid: 2, amount: 6765, date: testTime - 150, price: 548000 }
          // -- timeslot
        ]).then(expectResults({
          latestPrice: 550000,
          isPriceSurging: false,
          isUnderSellRatio: false
        }, [20, 0]))
      })

      it('should detect surge after new transaction finishes last timeslot', () => {
        return analyseTrends(testTime, [
          // -- timeslot
          { tid: 9, amount: 765, date: testTime - 50, price: 552900 },
          // -- timeslot
          { tid: 8, amount: 12254, date: testTime - 120, price: 551800 },
          { tid: 7, amount: 22454, date: testTime - 140, price: 552100 },
          { tid: 6, amount: 501, date: testTime - 199, price: 552300 },
          // -- timeslot
          { tid: 5, amount: 511, date: testTime - 201, price: 550300 },
          { tid: 4, amount: 3488, date: testTime - 201, price: 551100 }
        ]).then(expectResults({
          latestPrice: 552900,
          isPriceSurging: false,
          isUnderSellRatio: false
        }, [9.02, 10]))
          .then(() => analyseTrends(testTime, [
            // -- timeslot
            { tid: 10, amount: 6765, date: testTime - 20, price: 553200 },
            { tid: 9, amount: 765, date: testTime - 50, price: 552900 }
          ]))
          .then(expectResults({
            latestPrice: 553200,
            isPriceSurging: true,
            isUnderSellRatio: false
          }, [11.72, 10]))
      })
    })

    describe('SELL ratios', () => {
      it('should detect falling under ratio', () => {
        return analyseTrends(testTime, [
          // -- timeslot
          { tid: 9, amount: 6765, date: testTime - 50, price: 548800 },
          // -- timeslot
          { tid: 8, amount: 12254, date: testTime - 120, price: 549400 },
          // -- timeslot should get sorted below
          { tid: 3, amount: 12254, date: testTime - 280, price: 550000 }
        ]).then(expectResults({
          latestPrice: 548800,
          isPriceSurging: false,
          isUnderSellRatio: true
        }, [-6, -6]))
      })

      it('should NOT detect falling under ratio when just over limit', () => {
        return analyseTrends(testTime, [
          // -- timeslot
          { tid: 9, amount: 6765, date: testTime - 50, price: 549000 },
          // -- timeslot
          { tid: 8, amount: 12254, date: testTime - 120, price: 549500 },
          // -- timeslot
          { tid: 3, amount: 12254, date: testTime - 280, price: 550000 }
        ]).then(expectResults({
          latestPrice: 549000,
          isPriceSurging: false,
          isUnderSellRatio: false
        }, [-5, -5]))
      })

      it('should NOT detect falling under ratio when timeslot without transactions', () => {
        return analyseTrends(testTime, [
          // -- timeslot
          // -- timeslot
          { tid: 8, amount: 12254, date: testTime - 120, price: 549400 },
          // -- timeslot should get sorted below
          { tid: 3, amount: 12254, date: testTime - 280, price: 550000 }
        ]).then(expectResults({
          latestPrice: 549400,
          isPriceSurging: false,
          isUnderSellRatio: false
        }, [0, -6]))
      })
    })
  })

  describe('config checks', () => {
    const exchange = {}

    it('should throw exception when timeslotSeconds is not set', () => {
      const config = { clientId: 9 }
      expect(() => SurgeDetector(logger, config, exchange))
        .to.throw(Error, 'config.timeslotSeconds not found!')
    })

    it('should throw exception when buying.useTimeslots is less than 2', () => {
      const config = {
        clientId: 9999,
        timeslotSeconds: 100,
        buying: { useTimeslots: 1 },
        selling: { useTimeslots: 2 }
      }
      expect(() => SurgeDetector(logger, config, exchange))
        .to.throw(Error, 'config.buying.useTimeslots requires at least 2, found: 1')
    })

    it('should throw exception when buying.useTimeslots is not set', () => {
      const noUseTimeslots = {
        clientId: 9999,
        timeslotSeconds: 100,
        buying: {},
        selling: { useTimeslots: 2 }
      }
      expect(() => SurgeDetector(logger, noUseTimeslots, exchange))
        .to.throw(Error, 'config.buying.useTimeslots requires at least 2, found: undefined')
    })

    it('should throw exception when selling.useTimeslots is less than 2', () => {
      const config = {
        clientId: 9999,
        timeslotSeconds: 100,
        buying: { useTimeslots: 2 },
        selling: { useTimeslots: 1 }
      }
      expect(() => SurgeDetector(logger, config, exchange))
        .to.throw(Error, 'config.selling.useTimeslots requires at least 2, found: 1')
    })
  })
})
