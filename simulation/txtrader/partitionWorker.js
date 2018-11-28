const mongo = require('../../utils/mongoConnection')

const { timestamp } = require('../simrunUtils')
const { TantalusLogger } = require('../../utils/tantalusLogger')
const { mmBTC } = require('../../utils/ordersHelper')

const TransactionRepo = require('../../transactions/transactionsRepo')
const TransactionsSource = require('./txSource')
const TransactionSlicer = require('./txSlicer')

const { quietLogger } = require('../simrunUtils')
const baseLogger = console

class PartitionWorker {
  constructor (createTxSource = TransactionsSource, createTxSlicer = TransactionSlicer) {
    this.logger = TantalusLogger(baseLogger, `worker-${process.pid}`)

    this.createTxSource = createTxSource
    this.createTxSlicer = createTxSlicer
  }

  errorHandler (prefix) {
    return err => {
      this.logger.error(prefix + err.message)
      this.logger.log(err)
      if (err.cause !== undefined) this.errorHandler('<=== CAUSED BY: ')(err.cause)
    }
  }

  createTraders ({ traderConfigs, executorConfig }) {
    return mongo.connect(executorConfig, quietLogger)
      .then(() => {
        this.txSlicer = this.createTxSlicer(quietLogger, traderConfigs, executorConfig.transactionsUpdateSeconds)
        this.txsrc = this.createTxSource(quietLogger, TransactionRepo())
        return this.txsrc.reset(executorConfig.batchSeconds)
      })
      .catch(this.errorHandler('Partition worker (creating traders): '))
  }

  runIteration (iterationProgress) {
    if (!this.txsrc) throw Error('PartitionWorker not initialized, call createTraders(...)')

    const itString = `[it-${iterationProgress}]`
    const batchCount = this.txsrc.batchCount()
    const runIterationPromise = () => {
      if (this.txsrc.hasNext()) {
        return this.txsrc.next()
          .then(({ batchNum, from, to, transactions }) => {
            if ((batchNum % 10) === 1) {
              const num = batchNum.toString().padStart(batchCount.toString().length)
              this.logger.info(
                `${itString} batch [${num}/${batchCount}]: ${timestamp(from)} -> ${timestamp(to)}`
              )
            }
            this.txSlicer.runBatch(from, to, transactions)
            return runIterationPromise()
          })
      }
      this.logger.info(`${itString} no more batches, draining last transactions...`)
      this.txSlicer.drainLastSlice()
      return Promise.resolve()
    }

    return runIterationPromise().catch(this.errorHandler('Partition worker (running iteration): '))
  }

  getAccounts () {
    return this.txSlicer.getBalances().map(b => {
      return {
        clientId: b.clientId,
        amount: b.xbt_balance,
        price: b.latestPrice,
        volume: b.gbp_balance,
        fullVolume: b.gbp_balance + Math.floor(b.xbt_balance * b.latestPrice / mmBTC)
      }
    })
  }
}

module.exports = PartitionWorker
