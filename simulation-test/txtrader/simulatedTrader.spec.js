const expect = require('chai').expect
const deepAssign = require('assign-deep')

const SimulatedTrader = require('../../simulation/txtrader/simulatedTrader')

describe('Simulated trader', () => {
  const testVolumeLimit = 10000
  const testLowerVolumeLimit = 1000
  const testLowerAmountLimit = 80

  const fullConfig = {
    clientId: 'T( 300)_B(   3 / 3)_S(  -2 / 5)',
    buying: {
      ratio: 2.5,
      useTimeslots: 3,
      volumeLimitPence: testVolumeLimit,
      lowerLimitPence: testLowerVolumeLimit
    },
    selling: {
      ratio: -0.3,
      useTimeslots: 4,
      lowerLimit_mmBtc: testLowerAmountLimit
    }
  }

  const clientBalance = balance => deepAssign(balance, { clientId: fullConfig.clientId })

  describe('buying using ORDER price', () => {
    beforeEach(() => { trader = SimulatedTrader(fullConfig) })
    let trader

    const startBalance = latestPrice => clientBalance({
      latestPrice,
      gbp_balance: testVolumeLimit,
      xbt_balance: 0
    })

    it('should buy when ratio over buying ratio', () => {
      trader.nextTick([
        { tid: 'setting latestPrice', price: 5000, amount: 4 }
      ], [2.5, 2.51])
      trader.getBalance().should.deep.equal(startBalance(5000))

      trader.nextTick([
        { tid: 100, price: 5000, amount: 20000 },
        { tid: 101, price: 5000, amount: 20000 }
      ], [2.7, 2.4])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 5000,
        gbp_balance: 0,
        xbt_balance: 20000
      }))
    })

    it('should re-buy when ratios multiple times over buying ratio', () => {
      trader.nextTick([
        { tid: 'setting latestPrice', price: 56100, amount: 4 }
      ], [2.5, 2.51])
      trader.getBalance().should.deep.equal(startBalance(56100))

      //  resolve 1st open order + re-issue order after partial buy
      trader.nextTick([
        { tid: 101, price: 56101, amount: 50000 },
        { tid: 102, price: 56100, amount: 400 },
        { tid: 103, price: 55000, amount: 300 }
      ], [2.5, 2.51])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 55000,
        gbp_balance: 6073,
        xbt_balance: 700
      }))

      // resolve 2nd open order
      trader.nextTick([
        { tid: 104, price: 54000, amount: 2000 }
      ], [2.5, 2.51])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 54000,
        gbp_balance: 1,
        xbt_balance: 1804
      }))

      // no action under lowerLimitPence
      trader.nextTick([
        { tid: 104, price: 54000, amount: 2000 }
      ], [0, 0])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 54000,
        gbp_balance: 1,
        xbt_balance: 1804
      }))
    })

    it('should not buy with more volume than volumeLimit', () => {
      const testBalance = clientBalance({
        latestPrice: 1000,
        gbp_balance: testVolumeLimit + 500,
        xbt_balance: 0
      })

      trader = SimulatedTrader(fullConfig, testBalance)
      trader.nextTick([
        { tid: 'setting latestPrice', price: 50000, amount: 4 }
      ], [2.5, 2.51])
      trader.nextTick([
        { tid: 101, price: 45000, amount: 50000 }
      ], [0, 0])

      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 45000,
        gbp_balance: 500,
        xbt_balance: 2000
      }))
    })

    it('should remember latestPrice when no update in between', () => {
      trader.nextTick([
        { tid: 'setting latestPrice', price: 50000, amount: 4 }
      ], [2.5, 2.3])

      trader.nextTick([], [2.5, 2.51])
      trader.nextTick([
        { tid: 'resolving order', price: 49900, amount: 2000 }
      ], [0, 0])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 49900,
        gbp_balance: 0,
        xbt_balance: 2000
      }))
    })

    it('does not change txsUpdate data', () => {
      trader.nextTick([
        { tid: 'setting latestPrice', price: 50000, amount: 4 }
      ], [2.5, 2.51])

      const txsUpdate = [
        { tid: 'resolving order', price: 50000, amount: 2000 }
      ]
      trader.nextTick(txsUpdate, [0, 0])
      txsUpdate[0].amount.should.equal(2000)
    })

    it('should ignore when buying ratios not triggered', () => {
      trader.nextTick([
        { tid: 'setting latestPrice', price: 50000, amount: 4 }
      ], [2.6, 2.49])
      trader.nextTick([
        { tid: 'NOT resolving order', price: 50000, amount: 2000 }
      ], [0, 0])
      trader.getBalance().should.deep.equal(startBalance(50000))
    })

    it('should ignore when older ratio over buying ratio', () => {
      trader.nextTick([
        { tid: 'setting latest price', price: 5000, amount: 2 }
      ], [2.4, 2.51, 2.51])
      trader.nextTick([
        { tid: 'NOT resolving order', price: 50000, amount: 2000 }
      ], [0, 0])
      trader.getBalance().should.deep.equal(startBalance(50000))
    })

    it('should handle edge cases in trade volume', () => {
      const testConfig = {
        clientId: 'T( 100)_B(   2 / 2)_S(   -6 / 2)',
        buying: { ratio: 2, useTimeslots: 2, volumeLimitPence: 100000, lowerLimitPence: 10 },
        selling: { ratio: -6, useTimeslots: 2, lowerLimit_mmBtc: testLowerAmountLimit }
      }
      const testBalance = clientBalance({
        latestPrice: 1000,
        gbp_balance: 89100,
        xbt_balance: 2
      })

      const tradingPrice = 594000
      trader = SimulatedTrader(testConfig, testBalance)
      trader.nextTick([
        { tid: 'price surge', price: tradingPrice, amount: 4 }
      ], [2.5, 2.51])
      trader.nextTick([
        { tid: 100, price: tradingPrice, amount: 624 },
        { tid: 101, price: tradingPrice, amount: 622 },
        { tid: 102, price: tradingPrice, amount: 300 }
      ], [2.7, 2.4])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: tradingPrice,
        gbp_balance: 2,
        xbt_balance: 1502
      }))
    })
  })

  describe('selling using ORDER price', () => {
    const startBalance = latestPrice => clientBalance({
      latestPrice,
      gbp_balance: 6500,
      xbt_balance: 3000
    })

    beforeEach(() => { trader = SimulatedTrader(fullConfig, startBalance(100)) })
    let trader

    it('should sell when ratios under selling ratio', () => {
      const testBalance = clientBalance({
        latestPrice: 2,
        gbp_balance: 63,
        xbt_balance: 1988
      })

      trader = SimulatedTrader(fullConfig, testBalance)
      trader.nextTick([
        { tid: 'setting latestPrice', price: 502200, amount: 4 }
      ], [-4.2])
      trader.getBalance().should.deep.equal(testBalance)
      trader.nextTick([
        { tid: 101, price: 502200, amount: 77000 },
        { tid: 102, price: 502200, amount: 77000 }
      ], [-0.3, -0.3, -0.3])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 502200,
        gbp_balance: 99900,
        xbt_balance: 0
      }))
    })

    it('should re-sell when ratios multiple times under selling ratio', () => {
      trader.nextTick([
        { tid: 'setting latestPrice', price: 8000, amount: 4 }
      ], [-0.3, -0.4, -0.3])
      trader.getBalance().should.deep.equal(startBalance(8000))

      trader.nextTick([
        { tid: 101, price: 7999, amount: 77000 },
        { tid: 102, price: 8000, amount: 1000 },
        { tid: 103, price: 8100, amount: 1500 }
      ], [-0.3, -0.3, -0.3])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 8100,
        gbp_balance: 8500,
        xbt_balance: 500
      }))

      trader.nextTick([
        { tid: 104, price: 8100, amount: 421 }
      ], [-0.3, -0.3, -0.3])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 8100,
        gbp_balance: 8841,
        xbt_balance: 79
      }))

      // no action under lowerLimit_mmBtc
      trader.nextTick([], [-0.3, -0.3, -0.3])
      trader.getBalance().should.deep.equal(clientBalance({
        latestPrice: 8100,
        gbp_balance: 8841,
        xbt_balance: 79
      }))
    })

    it('should ignore when selling ratios not triggered', () => {
      trader.nextTick([
        { tid: 'setting latestPrice', price: 50000, amount: 4 }
      ], [-0.3, -0.3, -0.29])
      trader.nextTick([
        { tid: 'NOT resolving order', price: 50000, amount: 2000 }
      ], [0, 0, 0])
      trader.getBalance().should.deep.equal(startBalance(50000))
    })

    it('should ignore when older ratio under selling ratio', () => {
      trader.nextTick([
        { tid: 'setting latest price', price: 5000, amount: 2 }
      ], [-0.29, -0.3, -0.3, -0.4])
      trader.nextTick([
        { tid: 'NOT resolving order', price: 50000, amount: 2000 }
      ], [0, 0, 0])
      trader.getBalance().should.deep.equal(startBalance(50000))
    })
  })

  describe('config checks', () => {
    const validRatioConfig = {
      buying: { ratio: 2.5, useTimeslots: 3 },
      selling: { ratio: -2.5, useTimeslots: 3 }
    }

    const validLimitsConfig = {
      buying: { volumeLimitPence: testVolumeLimit, lowerLimitPence: testLowerVolumeLimit },
      selling: { lowerLimit_mmBtc: testLowerAmountLimit }
    }

    it('buying volumeLimit', () => {
      const wrongConfig = deepAssign({
        buying: { lowerLimitPence: testLowerVolumeLimit },
        selling: { lowerLimit_mmBtc: testLowerAmountLimit }
      }, validRatioConfig)

      expect(() => SimulatedTrader(wrongConfig))
        .to.throw(Error, 'Buy volume limit parameter missing!')
    })

    it('buying lowerLimit', () => {
      const wrongConfig = deepAssign({
        buying: { volumeLimitPence: testVolumeLimit },
        selling: { lowerLimit_mmBtc: testLowerAmountLimit }
      }, validRatioConfig)

      expect(() => SimulatedTrader(wrongConfig))
        .to.throw(Error, 'Buy volume lower limit parameter missing!')
    })

    it('selling lowerLimit', () => {
      const wrongConfig = deepAssign({
        buying: { volumeLimitPence: testVolumeLimit, lowerLimitPence: testLowerVolumeLimit }
      }, validRatioConfig)

      expect(() => SimulatedTrader(wrongConfig))
        .to.throw(Error, 'Sell volume lower limit parameter missing!')
    })

    it('buying ratio missing', () => {
      const wrongConfig = deepAssign({
        buying: { useTimeslots: 3 },
        selling: { ratio: 0, useTimeslots: 3 }
      }, validLimitsConfig)

      expect(() => SimulatedTrader(wrongConfig))
        .to.throw(Error, 'buying ratio parameter missing!')
    })

    it('selling ratio missing', () => {
      const wrongConfig = deepAssign({
        buying: { ratio: 0, useTimeslots: 3 },
        selling: { useTimeslots: 3 }
      }, validLimitsConfig)

      expect(() => SimulatedTrader(wrongConfig))
        .to.throw(Error, 'selling ratio parameter missing!')
    })

    it('buying timeslots under 2', () => {
      const wrongConfig = deepAssign({
        buying: { ratio: 0, useTimeslots: 1 },
        selling: { ratio: 0, useTimeslots: 3 }
      }, validLimitsConfig)

      expect(() => SimulatedTrader(wrongConfig))
        .to.throw(Error, 'buying timeslots parameter missing or less than 2!')
    })

    it('selling timeslots missing', () => {
      const wrongConfig = deepAssign({
        buying: { ratio: 2.5, useTimeslots: 3 },
        selling: { ratio: 0 }
      }, validLimitsConfig)

      expect(() => SimulatedTrader(wrongConfig))
        .to.throw(Error, 'selling timeslots parameter missing or less than 2!')
    })
  })
})
