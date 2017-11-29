const chai = require('chai')
const expect = chai.expect
const should = chai.should

const TraderConfigPermutator = require('../../../backend/simrun/configsgen/traderConfigPermutator')

describe('Trader config permutator', () => {
  describe('iterations information', () => {
    it('for all configured iterations, return current iteration', () => {
      const iterations = 10
      const genAlgoConfig = {
        iterations,
        selectionCutoff: 0.8,
        crossoverRate: 1,
        mutationRate: 1,
        mutationBoundaries: {},
        problemSpaceRanges: {
          timeslotSeconds: { start: 400, end: 400, step: 100 },
          buying: {
            ratio: { start: 2, end: 4, step: 1 },
            useTimeslots: { start: 4, end: 5, step: 1 }
          },
          selling: {
            ratio: { start: -3.5, end: -0.5, step: 1 },
            useTimeslots: { start: 4, end: 5, step: 1 }
          },
          commonTraderConfig: {}
        }
      }

      const permutator = TraderConfigPermutator(genAlgoConfig)
      permutator.currentIteration().should.equal(' 1/10')
      permutator.hasNext().should.equal(true)
    })

    it('throws exception when no iterations count configured', () => {
      const genAlgoConfig = {
        selectionCutoff: 0.8,
        crossoverRate: 1,
        mutationRate: 1,
        mutationBoundaries: {},
        problemSpaceRanges: {}
      }

      expect(() => TraderConfigPermutator(genAlgoConfig))
        .to.throw(Error, 'iterations not configured!')
    })
  })

  describe('next population', () => {
    const iterations = 1
    const mutationRate = 0.01
    const crossoverRate = 0.3

    const accountsResults = [
      { clientId: 'rank 2', fullVolume: 113020 },
      { clientId: 'rank 3', fullVolume: 101000 },
      { clientId: 'rank 5', fullVolume: 93010 },
      { clientId: 'rank 1', fullVolume: 119500 },
      { clientId: 'rank 4', fullVolume: 100000 }
    ]

    const traderConfigs = [{
      clientId: 'rank 2', timeslotSeconds: 400,
      buying: { ratio: 3.5, useTimeslots: 4 },
      selling: { ratio: -3.5, useTimeslots: 4 }
    }, {
      clientId: 'rank 3', timeslotSeconds: 200,
      buying: { ratio: 7.5, useTimeslots: 2 },
      selling: { ratio: -2.5, useTimeslots: 2 }
    }, {
      clientId: 'rank 5', timeslotSeconds: 300,
      buying: { ratio: 3.5, useTimeslots: 6 },
      selling: { ratio: -0.5, useTimeslots: 3 }
    }, {
      clientId: 'rank 1', timeslotSeconds: 700,
      buying: { ratio: 10, useTimeslots: 5 },
      selling: { ratio: -0.5, useTimeslots: 2 }
    }, {
      clientId: 'rank 4', timeslotSeconds: 650,
      buying: { ratio: 4.5, useTimeslots: 3 },
      selling: { ratio: -1.0, useTimeslots: 3 }
    }]

    const genAlgoConfig = {
      iterations,
      selectionCutoff: 0.8,
      crossoverRate,
      mutationRate,
      mutationBoundaries: {
        ts: { start: 100, step: 50, mutationStepsMax: 8 },
        bratio: { step: 0.5, mutationStepsMax: 2 },
        bslots: { start: 2, step: 1, mutationStepsMax: 1 },
        sratio: { step: 0.5, mutationStepsMax: 2 },
        sslots: { start: 2, step: 1, mutationStepsMax: 1 }
      },
      problemSpaceRanges: {
        timeslotSeconds: { start: 400, end: 400, step: 100 },
        buying: {
          ratio: { start: 2, end: 4, step: 1 },
          useTimeslots: { start: 4, end: 5, step: 1 }
        },
        selling: {
          ratio: { start: -3.5, end: -0.5, step: 0.5 },
          useTimeslots: { start: 4, end: 5, step: 1 }
        },
        commonTraderConfig: { all: 'shoud have this' }
      }
    }

    const testRandom = () => {
      let numberCallCount = 0

      const number = max => {
        numberCallCount++
        // parent selection:
        if (numberCallCount === 1) { max.should.equal(4); return 3 } // picked rank 4
        if (numberCallCount === 2) { max.should.equal(3); return 1 } // picked rank 2
        if (numberCallCount === 3) { max.should.equal(2); return 0 } // picked rank 1
        if (numberCallCount === 4) { max.should.equal(1); return 0 } // picked rank 3

        // first child field mutation selection:
        if (numberCallCount === 5) { max.should.equal(5); return 0 } // timeslotSeconds field
        if (numberCallCount === 6) { max.should.equal(9); return 8 } // should stay within problem space minimum boundary

        // second child field mutation selection:
        if (numberCallCount === 7) { max.should.equal(5); return 3 } // selling ratio field
        if (numberCallCount === 8) { max.should.equal(3); return 2 }

        // random immigrants selections
        if (numberCallCount === 9) { max.should.equal(84); return 40 }

        should.fail(`unexpected call to random: input max ${max}, call # ${numberCallCount}`)
      }

      let triggerCallCount = 0
      const trigger = ratio => {
        triggerCallCount++

        // crossover || recombination children of first parent pair
        if (triggerCallCount === 1) { ratio.should.equal(crossoverRate); return true } // timeslotSecs
        if (triggerCallCount === 2) { ratio.should.equal(crossoverRate); return false } // buy ratio
        if (triggerCallCount === 3) { ratio.should.equal(crossoverRate); return true } // buy timeslots
        if (triggerCallCount === 4) { ratio.should.equal(crossoverRate); return false } // sell ratio
        if (triggerCallCount === 5) { ratio.should.equal(crossoverRate); return false }  // sell timeslots

        //  crossover || recombination children of second parent pair
        if (triggerCallCount === 6) { ratio.should.equal(crossoverRate); return false }
        if (triggerCallCount === 7) { ratio.should.equal(crossoverRate); return false }
        if (triggerCallCount === 8) { ratio.should.equal(crossoverRate); return false }
        if (triggerCallCount === 9) { ratio.should.equal(crossoverRate); return true }
        if (triggerCallCount === 10) { ratio.should.equal(crossoverRate); return true }

        // mutate children:
        if (triggerCallCount === 11) { ratio.should.equal(mutationRate); return true }
        if (triggerCallCount === 12) { ratio.should.equal(mutationRate); return true }
        if (triggerCallCount === 13) { ratio.should.equal(mutationRate); return false }
        if (triggerCallCount === 14) { ratio.should.equal(mutationRate); return false }

        should.fail(`unexpected call to trigger: input ratio ${ratio}, call # ${triggerCallCount}`)
      }

      let plusMinusCallCount = 0
      const plusMinus = () => {
        plusMinusCallCount++

        // first child field mutation:
        if (plusMinusCallCount === 1) return -1  // timeslotSeconds +/- selection
        // second child field mutation:
        if (plusMinusCallCount === 2) return 1  // selling ratio +/- selection

        should.fail(`unexpected call to plusMinus: call # ${triggerCallCount}`)
      }

      return {
        number, trigger, plusMinus,
        getNumberCount: () => numberCallCount,
        getTriggerCount: () => triggerCallCount,
        getPlusMinusCount: () => plusMinusCallCount
      }
    }

    const deterministicChildren = [{
      clientId: 'T( 100)_B(   4 / 4)_S( -2.5 / 4)', timeslotSeconds: 100, // child 4/2
      buying: { ratio: 4.0, useTimeslots: 4 },
      selling: { ratio: -2.5, useTimeslots: 4 }
    }, {
      clientId: 'T( 650)_B(   4 / 3)_S( -1.5 / 4)', timeslotSeconds: 650, //  child 4/2
      buying: { ratio: 4.0, useTimeslots: 3 },
      selling: { ratio: -1.5, useTimeslots: 4 }
    }, {
      clientId: 'T( 450)_B(   9 / 4)_S( -2.5 / 2)', timeslotSeconds: 450, //  child 1/3
      buying: { ratio: 9, useTimeslots: 4 },
      selling: { ratio: -2.5, useTimeslots: 2 }
    }, {
      clientId: 'T( 450)_B(   9 / 4)_S( -0.5 / 2)', timeslotSeconds: 450, // child 1/3
      buying: { ratio: 9, useTimeslots: 4 },
      selling: { ratio: -0.5, useTimeslots: 2 }
    }, {
      clientId: 'T( 400)_B(   3 / 5)_S( -0.5 / 4)', timeslotSeconds: 400, // random immigrant
      buying: { ratio: 3, useTimeslots: 5 },
      selling: { ratio: -0.5, useTimeslots: 4 }
    }]

    const expectedDeterministicChildren = deterministicChildren
      .map(config => Object.assign(config, genAlgoConfig.problemSpaceRanges.commonTraderConfig))

    it('generate new generation', () => {
      const random = testRandom()
      const permutator = TraderConfigPermutator(genAlgoConfig, random)
      const nextGenerationConfigs = permutator.nextGeneration(accountsResults, traderConfigs)

      nextGenerationConfigs.should.deep.equal(expectedDeterministicChildren)
      random.getNumberCount().should.equal(9)
      random.getTriggerCount().should.equal(14)
      random.getPlusMinusCount().should.equal(2)
    })
  })
})

