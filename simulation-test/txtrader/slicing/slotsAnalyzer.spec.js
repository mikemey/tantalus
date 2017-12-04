
const SlotsAnalyzer = require('../../../simulation/txtrader/slicing/slotsAnalyzer')

describe('Slots analyzer', () => {
  const createIndexMap = indicesArray => {
    const dateIndices = new Map()
    indicesArray.forEach(indexEntry => dateIndices.set(indexEntry[0], indexEntry[1]))
    return dateIndices
  }

  describe('with valid worker configs', () => {
    const workerConfigs = {
      traderConfigs: [{
        timeslotSeconds: 100,
        buying: { ratio: 0, useTimeslots: 3 },
        selling: { ratio: 0, useTimeslots: 3 }
      }, {
        timeslotSeconds: 200,
        buying: { ratio: 1, useTimeslots: 2 },
        selling: { ratio: 0, useTimeslots: 2 }
      }, {
        timeslotSeconds: 100,
        buying: { ratio: 1, useTimeslots: 2 },
        selling: { ratio: 0, useTimeslots: 2 }
      }]
    }

    const analyzer = SlotsAnalyzer(workerConfigs)

    it('creates slots averages of first slice', () => {
      const data = {
        slotsWindow: [
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
        100: [0, 0, 0],
        200: [0]
      }
      analyzer.buildSlotsRatios(data.slotsWindow, data.slotsIndices, data.slotEndDate).should.deep.equal(expectedRatios)
    })

    it('creates slots averages of second slice', () => {
      const data = {
        slotsWindow: [
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
      analyzer.buildSlotsRatios(data.slotsWindow, data.slotsIndices, data.slotEndDate).should.deep.equal(expectedRatios)
    })

    it('creates slots averages of third slice', () => {
      const data = {
        slotsWindow: [
          { date: 230, price: 5, amount: 3 },
          { date: 280, price: 7, amount: 4 },
          { date: 280, price: 8, amount: 6 },
          { date: 430, price: 9, amount: 4 },
          { date: 529, price: 7, amount: 1 }
        ],
        slotEndDate: 529,
        slotsIndices: createIndexMap([
          [529, 5], [429, 3], [329, 3], [229, 0], [129, 0]
        ])
      }

      const expectedRatios = {
        100: [1.6, 0],
        200: [0]
      }
      analyzer.buildSlotsRatios(data.slotsWindow, data.slotsIndices, data.slotEndDate).should.deep.equal(expectedRatios)
    })

    it('creates slots averages of full slice', () => {
      const data = {
        slotsWindow: [
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
        200: [0.75476]
      }
      analyzer.buildSlotsRatios(data.slotsWindow, data.slotsIndices, data.slotEndDate).should.deep.equal(expectedRatios)
    })
  })

  it('should reject useTimeslots configuration < 2', () => {
    'hello'.shoul.equal('not yet implemented')
  })
  it('should reject zero or missing timeslotSeconds configuration', () => {
    'hello'.shoul.equal('not yet implemented')
  })
})
