const sinon = require('sinon')
const expect = require('chai').expect

const helpers = require('../../utils-test/helpers')

const PartitionWorker = require('../../simulation/txtrader/partitionWorker')

describe('Partition worker', () => {
  const testExecutorConfig = {
    mongodb: helpers.defaultTestConfig.mongodb,
    batchSeconds: 5000,
    transactionsUpdateSeconds: 50
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

  describe('with real txSource and txSlicer', () => {
    const dbTxs = [
      { tid: 50000, date: 50, amount: 100, price: 250000 },
      { tid: 70000, date: 70, amount: 400, price: 250500 },
      { tid: 120000, date: 120, amount: 1340, price: 250700 },
      { tid: 150000, date: 150, amount: 2211, price: 251000 },
      { tid: 210000, date: 210, amount: 400, price: 251000 },
      { tid: 220000, date: 220, amount: 32100, price: 251200 },
      { tid: 250000, date: 250, amount: 2001, price: 251200 },
      { tid: 270000, date: 270, amount: 15782, price: 251500 },
      { tid: 320000, date: 320, amount: 723, price: 251500 },
      { tid: 370000, date: 370, amount: 1000, price: 251500 },
      { tid: 470000, date: 470, amount: 333, price: 250900 },
      { tid: 520000, date: 510, amount: 722, price: 250900 }
    ]

    before(() => helpers.dropDatabase()
      .then(() => helpers.insertTransactions(dbTxs))
    )

    it('should run real example', () => {
      const workerConfigObject = {
        executorConfig: testExecutorConfig,
        traderConfigs: [{
          clientId: 'A',
          timeslotSeconds: 100,
          buying: { ratio: 2.3, useTimeslots: 3, volumeLimitPence: 18181, lowerLimitPence: 20 },
          selling: { ratio: -0.3, useTimeslots: 2, lowerLimit_mmBtc: 10 }
        }, {
          clientId: 'B',
          timeslotSeconds: 150,
          buying: { ratio: 3.3, useTimeslots: 2, volumeLimitPence: 10000, lowerLimitPence: 20 },
          selling: { ratio: 0, useTimeslots: 2, lowerLimit_mmBtc: 10 }
        }]
      }

      const partitionWorker = new PartitionWorker()
      return partitionWorker.createTraders(workerConfigObject)
        .then(() => partitionWorker.runIteration(3))
        .then(() => partitionWorker.getAccounts().should.deep.equal([
          { clientId: 'A', amount: 0, price: 250900, volume: 18138, fullVolume: 18138 },
          { clientId: 'B', amount: 398, price: 250900, volume: 2, fullVolume: 9988 }
        ], 'getAccounts not as expected'))
    })

    it('throw exception when createTraders not called', () => {
      const partitionWorker = new PartitionWorker()
      expect(() => partitionWorker.runIteration(2))
        .to.throw(Error, 'PartitionWorker not initialized, call createTraders(...)')
    })
  })
})
