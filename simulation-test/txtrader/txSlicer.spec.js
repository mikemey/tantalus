const sinon = require('sinon')
require('chai').should()
const TransactionSlicer = require('../../simulation/txtrader/txSlicer')

describe('Transaction slicer', () => {
  const testUpdateSeconds = 100
  const workerConfigs = { some: 'values see txSlicer.spec' }

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
    nextUpdateFull: false,
    txsUpdate: [],
    txsWindow: [{ tid: 529000 }, { tid: 430000 }, { tid: 280302 }, { tid: 280610 }, { tid: 230000 }]
  }]

  const expectedSlotsRatiosObject = {
    100: [3, 2, 1],
    300: [{ whatever: 'comes back' }]
  }

  it('builds slots averages', () => {
    const txWindowMock = {
      addBatchUpdate: sinon.stub(),
      nextTransactionUpdate: sinon.stub()
    }
    const createTxWindowMock = (config, txUpdateSeconds) => {
      config.should.deep.equal(workerConfigs)
      txUpdateSeconds.should.deep.equal(testUpdateSeconds)

      return txWindowMock
    }

    const slotsAnalyzer = { buildSlotsRatios: sinon.stub() }
    const createSlotsAnalyzer = config => {
      config.should.deep.equal(workerConfigs)
      return slotsAnalyzer
    }

    const sliceDistributor = { distribute: sinon.stub() }
    const createSliceDistributor = config => {
      config.should.deep.equal(workerConfigs)
      return sliceDistributor
    }

    txWindowMock.addBatchUpdate.withArgs(230, 777, dbBatch1).returns(230)
    txWindowMock.addBatchUpdate.withArgs(888, 999, dbBatch2).returns(999999)
    txWindowMock.nextTransactionUpdate.onCall(0).returns(transactionWindows[0])
    txWindowMock.nextTransactionUpdate.onCall(1).returns(transactionWindows[1])
    txWindowMock.nextTransactionUpdate.onCall(2).returns(transactionWindows[2])
    txWindowMock.nextTransactionUpdate.onCall(3).returns(transactionWindows[3])

    slotsAnalyzer.buildSlotsRatios.withArgs().returns(expectedSlotsRatiosObject)

    const slicer = TransactionSlicer(console, workerConfigs, testUpdateSeconds,
      createTxWindowMock, createSlotsAnalyzer, createSliceDistributor)

    slicer.runBatch(230, 777, dbBatch1)
    txWindowMock.addBatchUpdate.withArgs(230, 777, dbBatch1).called.should.equal(true)
    txWindowMock.nextTransactionUpdate.callCount.should.equal(2)
    sinon.assert.callOrder(
      slotsAnalyzer.buildSlotsRatios.withArgs(transactionWindows[0].txsWindow),
      slotsAnalyzer.buildSlotsRatios.withArgs(transactionWindows[1].txsWindow)
    )
    sinon.assert.callOrder(
      sliceDistributor.distribute.withArgs(transactionWindows[0].txsUpdate, expectedSlotsRatiosObject),
      sliceDistributor.distribute.withArgs(transactionWindows[1].txsUpdate, expectedSlotsRatiosObject)
    )

    slicer.runBatch(888, 999, dbBatch2)
    txWindowMock.addBatchUpdate.withArgs(888, 999, dbBatch2).called.should.equal(true)
    txWindowMock.nextTransactionUpdate.callCount.should.equal(3)
    slotsAnalyzer.buildSlotsRatios.withArgs(transactionWindows[2].txsWindow).called.should.equal(true)
    sliceDistributor.distribute.withArgs(transactionWindows[2].txsUpdate, expectedSlotsRatiosObject)
      .called.should.equal(true)

    slicer.drainLastSlice()
    txWindowMock.nextTransactionUpdate.callCount.should.equal(4)
    slotsAnalyzer.buildSlotsRatios.withArgs(transactionWindows[3].txsWindow).called.should.equal(true)
    sliceDistributor.distribute.withArgs(transactionWindows[3].txsUpdate, expectedSlotsRatiosObject)
      .called.should.equal(true)
  })
})
