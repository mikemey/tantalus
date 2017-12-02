const sinon = require('sinon')
const should = require('chai').should

const TransactionSlicer = require('../../simulation/txtrader/txSlicer')

describe('Transaction slicer', () => {
  const testUpdateSeconds = 10
  const workerConfigs = {
    traderConfigs: [{
      clientId: 'A',
      timeslotSeconds: 300,
      buying: { ratio: 0, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 3 }
    }, {
      clientId: 'B',
      timeslotSeconds: 100,
      buying: { ratio: 1, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 4 }
    }, {
      clientId: 'C',
      timeslotSeconds: 300,
      buying: { ratio: 2, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 2 }
    }]
  }

  const expectedAveragedSlotsObject = {
    100: [3, 2, 1],
    300: [{ whatever: 'comes back' }]
  }

  const dbBatch = [
    { tid: 300000, date: 430 },
    { tid: 280610, date: 280 },
    { tid: 280302, date: 280 },
    { tid: 230000, date: 230 }
  ]

  it.only('builds slots averages', () => {
    const txWindowMock = {
      addBatchUpdate: sinon.stub(),
      getTransactionUpdate: sinon.stub(),
      getTransactionWindow: sinon.stub()
    }

    const createTxWindowMock = windowSize => {
      windowSize.should.equal(400)
      return txWindowMock
    }

    const slotsAverager = { buildSlotsAverages: sinon.stub() }
    const createSlotsAverager = config => {
      config.should.deep.equal(workerConfigs)
      return slotsAverager
    }

    const sliceDistributor = { distribute: sinon.stub() }
    const createSliceDistributor = config => {
      config.should.deep.equal(workerConfigs)
      return sliceDistributor
    }

    slotsAverager.buildSlotsAverages.returns(expectedAveragedSlotsObject)

    const slicer = TransactionSlicer(console, workerConfigs, testUpdateSeconds,
      createTxWindowMock, createSlotsAverager, createSliceDistributor)
    slicer.runBatch(dbBatch)

    slotsAverager.buildSlotsAverages.withArgs().called.should.equal(true)
    // traderMocks.should.have.length(workerConfigs.traderConfigs.length)
    // const cancelStub = traderMock.cancelOrder
    // cancelStub.withArgs(100).called.should.equal(true)
  })

  it('should reject useTimeslots configuration < 2', () => {
    should.fail('not yet implemented')
  })

  it('should reject zero or missing timeslotSeconds configuration', () => {
    should.fail('not yet implemented')
  })
})
