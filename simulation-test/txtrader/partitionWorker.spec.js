const sinon = require('sinon')
const PartitionWorker = require('../../simulation/txtrader/partitionWorker')

describe('Partition worker', () => {
  let partitionWorker, txSourceMock, txSlicerMock

  beforeEach(() => {
    txSourceMock = {
      reset: sinon.stub(),
      next: sinon.stub(),
      hasNext: sinon.stub(),
      batchCount: () => 5
    }

    txSlicerMock = {
      runBatch: sinon.stub(),
      drainLastSlice: sinon.stub(),
      getBalances: sinon.stub()
    }

    partitionWorker = new PartitionWorker(() => txSourceMock, () => txSlicerMock)
    return partitionWorker.createTraders({})
  })

  it('setup TxSlicer and TxSource', () => {
    txSourceMock.reset.called.should.equal(true)
  })

  it('should run through batch iterations', () => {
    txSourceMock.hasNext.onCall(0).returns(true)
    txSourceMock.hasNext.onCall(1).returns(true)
    txSourceMock.hasNext.onCall(2).returns(false)

    const testBatch = {
      batchNum: 2, from: 100, to: 200, transactions: [{ abc: 'def' }]
    }
    txSourceMock.next.returns(Promise.resolve(testBatch))

    return partitionWorker.runIteration(2)
      .then(() => {
        txSlicerMock.runBatch.withArgs(testBatch.from, testBatch.to, testBatch.transactions)
          .callCount.should.equal(2)
        txSlicerMock.drainLastSlice.withArgs().callCount.should.equal(1)
      })
  })

  it('getAccounts should calculate accounts fullVolume', () => {
    const accountResponse = [
      { latestPrice: 45000, gbp_balance: 500, xbt_balance: 2000, clientId: 'A' },
      { latestPrice: 50000, gbp_balance: 500, xbt_balance: 0, clientId: 'B' },
      { latestPrice: 50000, gbp_balance: 0, xbt_balance: 2000, clientId: 'C' }
    ]

    const expectedAccounts = [
      { clientId: 'A', volume: 500, amount: 2000, fullVolume: 9500, price: 45000 },
      { clientId: 'B', volume: 500, amount: 0, fullVolume: 500, price: 50000 },
      { clientId: 'C', volume: 0, amount: 2000, fullVolume: 10000, price: 50000 }
    ]

    txSlicerMock.getBalances.returns(accountResponse)
    partitionWorker.getAccounts().should.deep.equal(expectedAccounts)
  })

  it('should configure real partition', () => {
    const workerConfigObject = {
      traderConfigs: [{
        clientId: 'A',
        timeslotSeconds: 100,
        buying: {
          ratio: 2.3, useTimeslots: 2,
          volumeLimitPence: 818181, lowerLimitPence: 20
        },
        selling: {
          ratio: -0.3, useTimeslots: 2,
          lowerLimit_mmBtc: 10
        }
      }]
    }
    const partitionWorker = new PartitionWorker()
    return partitionWorker.createTraders(workerConfigObject)
      .then(() => {
        partitionWorker.getAccounts().should.deep.equal([{
          clientId: 'A',
          amount: 0,
          price: 0,
          volume: 818181,
          fullVolume: 818181
        }], 'getAccounts not as expected')
      })
  })
})
