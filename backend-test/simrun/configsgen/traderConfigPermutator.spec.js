const chai = require('chai')
const expect = chai.expect
const should = chai.should

const TraderConfigPermutator = require('../../../backend/simrun/configsgen/traderConfigPermutator')

describe('Trader config permutator', () => {
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

  describe('iterations information', () => {
    it('for all configured iterations, return current iteration', () => {
      const iterations = 10
      const permutatorConfig = {
        permutations: {
          iterations
        }
      }
      const accountsResults = [{ clientId: 'A', fullVolume: 30200 }]

      const traderConfigs = [{
        clientId: 'A',
        timeslotSeconds: { start: 400, end: 400, step: 100 },
        buying: {
          ratio: { start: 2, end: 4, step: 1 }
        }
      }]

      const permutator = TraderConfigPermutator(permutatorConfig)
      const expectedIteration = currentIx => `${currentIx}/${iterations}`

      Array.from({ length: iterations }, (_, ix) => {
        const expectedIterString = ix < 9
          ? expectedIteration(` ${ix + 1}`)
          : expectedIteration('10')

        permutator.currentIteration().should.equal(expectedIterString)
        permutator.mutate(accountsResults, traderConfigs)
      })
    })

    it('throws exception when no iterations count configured', () => {
      const permutatorConfig = {
        permutations: {}
      }
      expect(() => TraderConfigPermutator(permutatorConfig))
        .to.throw(Error, 'iterations not configured!')
    })
  })

  describe('mutations', () => {
    it('throws exception when no configuration was found for a trader clientId', () => {
      const permutatorConfig = {
        permutations: {}
      }
      expect(() => TraderConfigPermutator(permutatorConfig))
        .to.throw(Error, 'No configuration found for client: [A]')
    })

    it.only('generate new generation', () => {
      const iterations = 1
      const mutationRate = 0.01
      const crossoverRate = 0.3

      const genAlgoConfig = {
        genAlgo: {
          iterations,
          selectionCutoff: 0.8,
          crossoverRate,
          mutationRate,
          mutationStepsMaxima: {
            ts: 2,
            bratio: 2,
            bslots: 2,
            sratio: 2,
            sslots: 2
          },
          problemSpaceBoundaries: {
            ts: { start: 100, step: 50 },
            bratio: { step: 0.5 },
            bslots: { start: 2, step: 1 },
            sratio: { step: 0.5 },
            sslots: { start: 2, step: 1 }
          },
          commonTraderConfig: { all: 'shoud have this' }
        }
      }

      const testRandom = () => {
        let randomCallCount = 0

        const number = max => {
          randomCallCount++
          // parent selection:
          if (randomCallCount === 1) { max.should.equal(4); return 3 } // picked rank 4
          if (randomCallCount === 2) { max.should.equal(3); return 1 } // picked rank 2
          if (randomCallCount === 3) { max.should.equal(2); return 0 } // picked rank 1
          if (randomCallCount === 4) { max.should.equal(1); return 0 } // picked rank 3

          // first child field mutation selection:
          if (randomCallCount === 5) { max.should.equal(5); return 0 } // timeslotSeconds field
          if (randomCallCount === 7) { max.should.equal(2); return 0 } // should keep full problem space minimum

          // second child field mutation selection:
          if (randomCallCount === 7) { max.should.equal(3); return 0 } // selling ratio field
          if (randomCallCount === 8) { max.should.equal(2); return 1 } // should keep full problem space maximum

          // random immigrants selections
          if (randomCallCount === 8) { max.should.equal(23205); return 40 }

          should.fail(`unexpected call to random: input max ${max}, call # ${randomCallCount}`)
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

          // mutation cycle:
          if (triggerCallCount === 11) { ratio.should.equal(mutationRate); return true }
          if (triggerCallCount === 12) { ratio.should.equal(mutationRate); return true }
          if (triggerCallCount === 13) { ratio.should.equal(mutationRate); return false }
          if (triggerCallCount === 14) { ratio.should.equal(mutationRate); return false }

          // first child field mutation:
          if (triggerCallCount === 15) { ratio.should.equal(0.5); return false } // timeslotSeconds field +/- selection
          // second child field mutation:
          if (triggerCallCount === 16) { ratio.should.equal(0.5); return true } // selling ratio field +/- selection

          should.fail(`unexpected call to trigger: input ratio ${ratio}, call # ${triggerCallCount}`)
        }

        return {
          number, trigger
        }
      }

      const deterministicChildren = [{
        clientId: 'T( 100)_B(   4 / 4)_S(- 2.5 / 4)', timeslotSeconds: 100, // rank 4
        buying: { ratio: 4.0, useTimeslots: 4 },
        selling: { ratio: -2.5, useTimeslots: 4 }
      }, {
        clientId: 'T( 650)_B(   4 / 3)_S(- 2.5 / 4)', timeslotSeconds: 650, // rank 2
        buying: { ratio: 4.0, useTimeslots: 3 },
        selling: { ratio: -2.5, useTimeslots: 4 }
      }, {
        clientId: 'T( 450)_B(   9 / 4)_S(- 2.5 / 2)', timeslotSeconds: 450, // rank 1
        buying: { ratio: 9, useTimeslots: 4 },
        selling: { ratio: -2.5, useTimeslots: 2 }
      }, {
        clientId: 'T( 450)_B(   9 / 4)_S(- 0.5 / 2)', timeslotSeconds: 450, // rank 3
        buying: { ratio: 9, useTimeslots: 4 },
        selling: { ratio: -0.5, useTimeslots: 2 }
      }, {
        clientId: 'random immigrant'
      }]

      const expectedDeterministicChildren = deterministicChildren
        .map(config => Object.assign(config, genAlgoConfig.genAlgo.commonTraderConfig))

      const permutator = TraderConfigPermutator(genAlgoConfig, testRandom())
      const nextGenerationConfigs = permutator.nextGeneration(accountsResults, traderConfigs)

      nextGenerationConfigs.should.deep.equal(expectedDeterministicChildren)
    })
  })
})

