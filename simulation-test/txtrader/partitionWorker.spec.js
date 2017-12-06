const sinon = require('sinon')

const helpers = require('../../utils-test/helpers')

const PartitionWorker = require('../../simulation/txtrader/partitionWorker')

describe('Partition worker', () => {
  const testExecutorConfig = {
    mongodb: helpers.defaultTestConfig.mongodb,
    batchSeconds: 5000,
    transactionsUpdateSeconds: 20
  }

  describe('with mocked txSource and txSlicer', () => {
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

      const testWorkerCfg = {
        executorConfig: testExecutorConfig,
        traderConfigs: [{ tid: 1 }]
      }

      const createTxSlicerMock = (logger, traderConfigs, txUpdateSecs) => {
        traderConfigs.should.deep.equal(testWorkerCfg.traderConfigs)
        txUpdateSecs.should.equal(testExecutorConfig.transactionsUpdateSeconds)
        return txSlicerMock
      }

      partitionWorker = new PartitionWorker(() => txSourceMock, createTxSlicerMock)
      return partitionWorker.createTraders(testWorkerCfg)
    })

    it('setup TxSlicer and TxSource', () => {
      txSourceMock.reset.withArgs(testExecutorConfig.batchSeconds).called.should.equal(true)
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
  })

  describe('with mocked txSource and txSlicer', () => {
    it('should configure partition', () => {
      const workerConfigObject = {
        executorConfig: testExecutorConfig,
        traderConfigs: [{
          clientId: 'A',
          timeslotSeconds: 100,
          buying: { ratio: 2.3, useTimeslots: 2, volumeLimitPence: 818181, lowerLimitPence: 20 },
          selling: { ratio: -0.3, useTimeslots: 2, lowerLimit_mmBtc: 10 }
        }, {
          clientId: 'B',
          timeslotSeconds: 200,
          buying: { ratio: 3.3, useTimeslots: 2, volumeLimitPence: 1000, lowerLimitPence: 20 },
          selling: { ratio: 0, useTimeslots: 2, lowerLimit_mmBtc: 10 }
        }]
      }

      const partitionWorker = new PartitionWorker()
      return partitionWorker.createTraders(workerConfigObject)
        .then(() => {
          partitionWorker.getAccounts().should.deep.equal([
            { clientId: 'A', amount: 0, price: 0, volume: 818181, fullVolume: 818181 },
            { clientId: 'B', amount: 0, price: 0, volume: 1000, fullVolume: 1000 }
          ], 'getAccounts not as expected')
        })
    })
  })
})
