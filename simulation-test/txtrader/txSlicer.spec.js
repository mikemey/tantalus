const sinon = require('sinon')
const should = require('chai').should

const TransactionSlicer = require('../../simulation/txtrader/txSlicer')

describe('Transaction slicer', () => {
  const testUpdateSeconds = 100
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

  const maxWindowTime = 4 * 100 // client 'B'

  const dbBatch1 = [
    { tid: 230000, date: 230 },
    { tid: 280610, date: 280 },
    { tid: 280302, date: 280 },
    { tid: 430000, date: 430 }
  ]

  const dbBatch2 = [{ tid: 529000, date: 529 }]

  const transactionWindows = [{
    nextUpdateFull: true,
    txsUpdate: [{ tid: 230000 }, { tid: 280610 }, { tid: 280302 }],
    txsWindow: [{ tid: 280302 }, { tid: 280610 }, { tid: 230000 }]
  }, {
    nextUpdateFull: false,
    txsUpdate: [],
    txsWindow: [{ tid: 280302 }, { tid: 280610 }, { tid: 230000 }]
  }, {
    nextUpdateFull: false,
    txsUpdate: [{ tid: 430000 }, { tid: 529000 }],
    txsWindow: [{ tid: 529000 }, { tid: 430000 }, { tid: 280302 }, { tid: 280610 }, { tid: 230000 }]
  }, {
    nextUpdateFull: 'wurscht - drainLastSlice with 530',
    txsUpdate: [],
    txsWindow: [{ tid: 529000 }, { tid: 430000 }, { tid: 280302 }, { tid: 280610 }, { tid: 230000 }]
  }]

  const expectedSlotsRatiosObject = {
    100: [3, 2, 1],
    300: [{ whatever: 'comes back' }]
  }

  const expectedDistributeArgs = transactionWindowIndex => {
    return {
      txs: transactionWindows[transactionWindowIndex].txsUpdate,
      slotsRatios: expectedSlotsRatiosObject
    }
  }

  it.only('builds slots averages', () => {
    const txWindowMock = {
      addBatchUpdate: sinon.stub(),
      getTransactionUpdate: sinon.stub()
    }

    const createTxWindowMock = (updateSeconds, windowSeconds) => {
      updateSeconds.should.equal(testUpdateSeconds)
      windowSeconds.should.equal(maxWindowTime)
      return txWindowMock
    }

    const slotsAnalyzer = { buildSlotsRatios: sinon.stub() }
    const createSlotsAverager = config => {
      config.should.deep.equal(workerConfigs)
      return slotsAnalyzer
    }

    const sliceDistributor = { distribute: sinon.stub() }
    const createSliceDistributor = config => {
      config.should.deep.equal(workerConfigs)
      return sliceDistributor
    }

    txWindowMock.addBatchUpdate.withArgs(dbBatch1).returns(230)
    txWindowMock.addBatchUpdate.withArgs(dbBatch2).returns(999999)
    txWindowMock.getTransactionUpdate.withArgs(230).returns([transactionWindows[0]])
    txWindowMock.getTransactionUpdate.withArgs(330).returns([transactionWindows[1]])
    txWindowMock.getTransactionUpdate.withArgs(430).returns([transactionWindows[2]])
    txWindowMock.getTransactionUpdate.withArgs(530).returns([transactionWindows[3]])

    slotsAnalyzer.buildSlotsRatios.withArgs().returns(expectedSlotsRatiosObject)

    const slicer = TransactionSlicer(console, workerConfigs, testUpdateSeconds,
      createTxWindowMock, createSlotsAverager, createSliceDistributor)

    slicer.runBatch(dbBatch1)
    txWindowMock.addBatchUpdate.withArgs(dbBatch1).called.should.equal(true)
    sinon.assert.callOrder(
      txWindowMock.getTransactionUpdate.withArgs(230),
      txWindowMock.getTransactionUpdate.withArgs(330)
    )
    sinon.assert.callOrder(
      slotsAnalyzer.buildSlotsRatios.withArgs(transactionWindows[0].txsWindow),
      slotsAnalyzer.buildSlotsRatios.withArgs(transactionWindows[1].txsWindow)
    )
    sinon.assert.callOrder(
      sliceDistributor.distribute.withArgs(expectedDistributeArgs(0)),
      sliceDistributor.distribute.withArgs(expectedDistributeArgs(1))
    )

    slicer.runBatch(dbBatch2)
    txWindowMock.addBatchUpdate.withArgs(dbBatch2).called.should.equal(true)
    txWindowMock.getTransactionUpdate.withArgs(430).called.should.equal(true)
    slotsAnalyzer.buildSlotsRatios.withArgs(transactionWindows[2].txsWindow).called.should.equal(true)
    sliceDistributor.distribute.withArgs(expectedDistributeArgs(2)).called.should.equal(true)

    slicer.drainLastSlice()
    txWindowMock.getTransactionUpdate.withArgs(530).called.should.equal(true)
    slotsAnalyzer.buildSlotsRatios.withArgs(transactionWindows[3].txsWindow).called.should.equal(true)
    sliceDistributor.distribute.withArgs(expectedDistributeArgs(3)).called.should.equal(true)
  })

  it('should reject useTimeslots configuration < 2', () => {
    should.fail('not yet implemented')
  })

  it('should reject zero or missing timeslotSeconds configuration', () => {
    should.fail('not yet implemented')
  })
})
