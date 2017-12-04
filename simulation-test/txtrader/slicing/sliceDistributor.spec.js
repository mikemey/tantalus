const sinon = require('sinon')
const expect = require('chai').expect

const SliceDistributor = require('../../../simulation/txtrader/slicing/sliceDistributor')

describe('Slice distributor', () => {
  const workerConfigs = {
    traderConfigs: [{
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
  }

  const txsUpdate = [{ tid: 630100 }, { tid: 630200 }]

  const slotsRatios = {
    100: [0, 0],
    200: [0.8]
  }

  it('distribute slices', () => {
    const traderMocks = []

    let traderConfigIx = 0
    const createTraderMock = config => {
      config.should.deep.equal(workerConfigs.traderConfigs[traderConfigIx++])
      const mock = {
        nextTick: sinon.stub()
      }
      traderMocks.push(mock)
      return mock
    }

    const sliceDistributor = SliceDistributor(workerConfigs, createTraderMock)
    sliceDistributor.distribute(txsUpdate, slotsRatios)
    traderMocks.should.have.length(3)
    traderMocks[0].nextTick.withArgs(txsUpdate, slotsRatios[100])
      .called.should.equal(true)
    traderMocks[1].nextTick.withArgs(txsUpdate, slotsRatios[200])
      .called.should.equal(true)
    traderMocks[2].nextTick.withArgs(txsUpdate, slotsRatios[100])
      .called.should.equal(true)
  })

  it('throws Error when timeslotSeconds not set', () => {
    const wrongConfig = {
      traderConfigs: [{
        buying: { ratio: 0, useTimeslots: 2 },
        selling: { ratio: 0, useTimeslots: 2 }
      }]
    }
    expect(() => SliceDistributor(wrongConfig, () => { }))
    .to.throw(Error, 'timeslotSeconds not configured!')
  })
})
