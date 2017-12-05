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

  const expectedIndices = ix => {
    const mockDateIndices = new Map()
    mockDateIndices.set(ix, ix)
    return mockDateIndices
  }

  const transactionWindows = [{
    nextUpdateFull: true,
    txsUpdate: [{ tid: 230000 }, { tid: 280610 }, { tid: 280302 }],
    transactions: [{ tid: 280302 }, { tid: 280610 }, { tid: 230000 }],
    slotEndDate: 329,
    slotsIndices: expectedIndices(0)
  }, {
    nextUpdateFull: false,
    txsUpdate: [],
    transactions: [{ tid: 280302 }, { tid: 280610 }, { tid: 230000 }],
    slotEndDate: 429,
    slotsIndices: expectedIndices(1)
  }, {
    nextUpdateFull: false,
    txsUpdate: [{ tid: 430000 }, { tid: 529000 }],
    transactions: [{ tid: 529000 }, { tid: 430000 }, { tid: 280302 }, { tid: 280610 }, { tid: 230000 }],
    slotEndDate: 529,
    slotsIndices: expectedIndices(2)
  }, {
    nextUpdateFull: false,
    txsUpdate: [],
    transactions: [{ tid: 529000 }, { tid: 430000 }, { tid: 280302 }, { tid: 280610 }, { tid: 230000 }],
    slotEndDate: 629,
    slotsIndices: expectedIndices(3)
  }]

  const expectedSlotsRatiosObject = {
    100: [3, 2, 1],
    300: [{ whatever: 'comes back' }]
  }

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

  const testCreateTraderFunc = () => { }
  const sliceDistributor = {
    distribute: sinon.stub(),
    getBalances: sinon.stub()
  }
  const createSliceDistributor = (config, createTraderFunc) => {
    config.should.deep.equal(workerConfigs)
    createTraderFunc.should.equal(testCreateTraderFunc)
    return sliceDistributor
  }

  it('builds slots averages', () => {
    txWindowMock.addBatchUpdate.withArgs(230, 777, dbBatch1).returns(230)
    txWindowMock.addBatchUpdate.withArgs(888, 999, dbBatch2).returns(999999)
    txWindowMock.nextTransactionUpdate.onCall(0).returns(transactionWindows[0])
    txWindowMock.nextTransactionUpdate.onCall(1).returns(transactionWindows[1])
    txWindowMock.nextTransactionUpdate.onCall(2).returns(transactionWindows[2])
    txWindowMock.nextTransactionUpdate.onCall(3).returns(transactionWindows[3])

    slotsAnalyzer.buildSlotsRatios.withArgs().returns(expectedSlotsRatiosObject)

    const buildSlotsRatiosWindow = txWindowIx => {
      return slotsAnalyzer.buildSlotsRatios.withArgs(
        transactionWindows[txWindowIx].transactions,
        transactionWindows[txWindowIx].slotsIndices,
        transactionWindows[txWindowIx].slotEndDate
      )
    }

    const slicer = TransactionSlicer(console, workerConfigs, testUpdateSeconds,
      createTxWindowMock, createSlotsAnalyzer, createSliceDistributor, testCreateTraderFunc)

    slicer.runBatch(230, 777, dbBatch1)
    txWindowMock.addBatchUpdate.withArgs(230, 777, dbBatch1).called.should.equal(true)
    txWindowMock.nextTransactionUpdate.callCount.should.equal(2)
    sinon.assert.callOrder(
      buildSlotsRatiosWindow(0),
      buildSlotsRatiosWindow(1)
    )
    sinon.assert.callOrder(
      sliceDistributor.distribute.withArgs(transactionWindows[0].txsUpdate, expectedSlotsRatiosObject),
      sliceDistributor.distribute.withArgs(transactionWindows[1].txsUpdate, expectedSlotsRatiosObject)
    )

    slicer.runBatch(888, 999, dbBatch2)
    txWindowMock.addBatchUpdate.withArgs(888, 999, dbBatch2).called.should.equal(true)
    txWindowMock.nextTransactionUpdate.callCount.should.equal(3)
    buildSlotsRatiosWindow(2).called.should.equal(true)
    sliceDistributor.distribute.withArgs(transactionWindows[2].txsUpdate, expectedSlotsRatiosObject)
      .called.should.equal(true)

    slicer.drainLastSlice()
    txWindowMock.nextTransactionUpdate.callCount.should.equal(4)
    buildSlotsRatiosWindow(3).called.should.equal(true)
    sliceDistributor.distribute.withArgs(transactionWindows[3].txsUpdate, expectedSlotsRatiosObject)
      .called.should.equal(true)
  })

  it('should forward accounts', () => {
    const testAccounts = [{ abc: 'def' }]
    sliceDistributor.getBalances.returns(testAccounts)

    const slicer = TransactionSlicer(console, workerConfigs, testUpdateSeconds,
      createTxWindowMock, createSlotsAnalyzer, createSliceDistributor, testCreateTraderFunc)

    slicer.getBalances().should.deep.equal(testAccounts)
  })
})
