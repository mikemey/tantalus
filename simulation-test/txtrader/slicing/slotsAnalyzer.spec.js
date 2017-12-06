const expect = require('chai').expect

const SlotsAnalyzer = require('../../../simulation/txtrader/slicing/slotsAnalyzer')

describe('Slots analyzer', () => {
  const createIndexMap = indicesArray => {
    const dateIndices = new Map()
    indicesArray.forEach(indexEntry => dateIndices.set(indexEntry[0], indexEntry[1]))
    return dateIndices
  }

  describe('with valid worker configs', () => {
    const traderConfigs = [{
      timeslotSeconds: 100,
      buying: { ratio: 0, useTimeslots: 2 },
      selling: { ratio: 0, useTimeslots: 2 }
    }, {
      timeslotSeconds: 200,
      buying: { ratio: 1, useTimeslots: 2 },
      selling: { ratio: 0, useTimeslots: 2 }
    }, {
      timeslotSeconds: 100,
      buying: { ratio: 1, useTimeslots: 3 },
      selling: { ratio: 0, useTimeslots: 3 }
    }]

    const analyzer = SlotsAnalyzer(traderConfigs)

    it('creates slots averages of first slice', () => {
      const data = {
        transactions: [
          { date: 230, price: 5, amount: 3 },
          { date: 280, price: 7, amount: 4 },
          { date: 280, price: 8, amount: 6 }
        ],
        slotEndDate: 329,
        slotsIndices: createIndexMap([
          [329, 3], [229, 0], [129, 0], [29, 0], [-71, 0]
        ])
      }

      const expectedRatios = {
        100: [0, 0],
        200: [0]
      }
      analyzer.buildSlotsRatios(data.transactions, data.slotsIndices, data.slotEndDate).should.deep.equal(expectedRatios)
    })

    it('creates slots averages of second slice', () => {
      const data = {
        transactions: [
          { date: 230, price: 5, amount: 3 },
          { date: 280, price: 7, amount: 4 },
          { date: 280, price: 8, amount: 6 }
        ],
        slotEndDate: 429,
        slotsIndices: createIndexMap([
          [429, 3], [329, 3], [229, 0], [129, 0], [29, 0]
        ])
      }

      const expectedRatios = {
        100: [0, 0],
        200: [0]
      }
      analyzer.buildSlotsRatios(data.transactions, data.slotsIndices, data.slotEndDate).should.deep.equal(expectedRatios)
    })

    it('creates slots averages of third slice', () => {
      const data = {
        transactions: [
          { date: 230, price: 500, amount: 3 },
          { date: 280, price: 700, amount: 4 },
          { date: 280, price: 800, amount: 6 },
          { date: 430, price: 900, amount: 4 },
          { date: 529, price: 700, amount: 1 }
        ],
        slotEndDate: 529,
        slotsIndices: createIndexMap([
          [529, 5], [429, 3], [329, 3], [229, 0], [129, 0]
        ])
      }

      const expectedRatios = {
        100: [0, 0],
        200: [0.8]
      }
      analyzer.buildSlotsRatios(data.transactions, data.slotsIndices, data.slotEndDate).should.deep.equal(expectedRatios)
    })

    it('creates slots averages of full slice', () => {
      const data = {
        transactions: [
          { date: 230, price: 500, amount: 3 },
          { date: 280, price: 700, amount: 4 },
          { date: 280, price: 800, amount: 6 },
          { date: 330, price: 600, amount: 2 },
          { date: 370, price: 800, amount: 6 },
          { date: 470, price: 900, amount: 5 },
          { date: 529, price: 1000, amount: 3 },
          { date: 530, price: 600, amount: 2 }
        ],
        slotEndDate: 629,
        slotsIndices: createIndexMap([
          [629, 8], [529, 7], [429, 5], [329, 3], [229, 0]
        ])
      }

      const expectedRatios = {
        100: [-3.375, 1.875],
        200: [0.7547619047619049]
      }
      analyzer.buildSlotsRatios(data.transactions, data.slotsIndices, data.slotEndDate).should.deep.equal(expectedRatios)
    })
  })

  it('should reject useTimeslots configuration < 2', () => {
    const traderConfigs = [{
      timeslotSeconds: 100,
      buying: { ratio: 0, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 2 }
    }]

    expect(() => SlotsAnalyzer(traderConfigs))
      .to.throw(Error, 'useTimeslots less than 2, was: 1')
  })

  it('should reject zero timeslotSeconds configuration', () => {
    const traderConfigs = [{
      timeslotSeconds: 0,
      buying: { ratio: 0, useTimeslots: 2 },
      selling: { ratio: 0, useTimeslots: 2 }
    }]

    expect(() => SlotsAnalyzer(traderConfigs))
      .to.throw(Error, 'timeslotSeconds not configured!')
  })

  it('should reject  missing timeslotSeconds configuration', () => {
    const traderConfigs = [{
      buying: { ratio: 0, useTimeslots: 2 },
      selling: { ratio: 0, useTimeslots: 2 }
    }]

    expect(() => SlotsAnalyzer(traderConfigs))
      .to.throw(Error, 'timeslotSeconds not configured!')
  })
})
