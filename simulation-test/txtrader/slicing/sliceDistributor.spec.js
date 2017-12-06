const sinon = require('sinon')
const expect = require('chai').expect

const SliceDistributor = require('../../../simulation/txtrader/slicing/sliceDistributor')

describe('Slice distributor', () => {
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

  const txsUpdate = [{ tid: 630100 }, { tid: 630200 }]

  const slotsRatios = {
    100: [0, 0],
    200: [0.8]
  }

  let traderMocks = []
  let traderConfigIx = 0

  beforeEach(() => {
    traderMocks = []
    traderConfigIx = 0
  })

  const createTraderMock = config => {
    config.should.deep.equal(traderConfigs[traderConfigIx++])
    const mock = {
      nextTick: sinon.stub(),
      getBalance: sinon.stub()
    }
    traderMocks.push(mock)
    return mock
  }

  it('distribute slices', () => {
    const sliceDistributor = SliceDistributor(traderConfigs, createTraderMock)
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
    const wrongTraderConfigs = [{
      buying: { ratio: 0, useTimeslots: 2 },
      selling: { ratio: 0, useTimeslots: 2 }
    }]

    expect(() => SliceDistributor(wrongTraderConfigs, () => { }))
      .to.throw(Error, 'timeslotSeconds not configured!')
  })

  it('should forward accounts', () => {
    const testAccounts = [
      { clientId: 'A', bla: 'bla bla' },
      { clientId: 'B', bla: 'bla bla' },
      { clientId: 'C', bla: 'bla bla' }
    ]
    const sliceDistributor = SliceDistributor(traderConfigs, createTraderMock)

    testAccounts.forEach((testAccount, ix) => {
      traderMocks[ix].getBalance.returns(testAccount)
    })

    sliceDistributor.getBalances().should.deep.equal(testAccounts)
  })
})
