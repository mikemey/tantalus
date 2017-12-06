const mongo = require('../../utils/mongoConnection')

const { timestamp } = require('../simrunUtils')
const { TantalusLogger } = require('../../utils/tantalusLogger')
const { roundVolume } = require('../../utils/ordersHelper')

const TransactionRepo = require('../../transactions/transactionsRepo')
const TransactionsSource = require('./txSource')
const TransactionSlicer = require('./txSlicer')

const baseLogger = console

class PartitionWorker {
  // eslint-disable-next-line space-before-function-paren
  constructor(createTxSource = TransactionsSource, createTxSlicer = TransactionSlicer) {
    this.logger = TantalusLogger(baseLogger, `worker-${process.pid}`)

    this.createTxSource = createTxSource
    this.createTxSlicer = createTxSlicer
  }

  // eslint-disable-next-line space-before-function-paren
  errorHandler(prefix) {
    return err => {
      this.logger.error(prefix + err.message)
      this.logger.log(err)
      if (err.cause !== undefined) this.errorHandler('<=== CAUSED BY: ')(err.cause)
    }
  }
  // eslint-disable-next-line space-before-function-paren
  createTraders({ traderConfigs, executorConfig }) {
    return mongo.initializeDirectConnection(executorConfig, this.logger)
      .then(() => {
        this.txSlicer = this.createTxSlicer(this.logger, traderConfigs, executorConfig.transactionsUpdateSeconds)
        this.txsrc = this.createTxSource(this.logger, TransactionRepo())
        return this.txsrc.reset(executorConfig.batchSeconds)
      })
      .catch(this.errorHandler('Partition worker (creating traders): '))
  }

  // eslint-disable-next-line space-before-function-paren
  runIteration(iterationProgress) {
    if (!this.txsrc) throw Error('PartitionWorker not initialized, call createTraders(...)')

    const itString = `[it-${iterationProgress}]`
    const batchCount = this.txsrc.batchCount()
    const runIterationPromise = () => {
      if (this.txsrc.hasNext()) {
        this.logger.info('reading transactions...')
        return this.txsrc.next()
          .then(({ batchNum, from, to, transactions }) => {
            const num = batchNum.toString().padStart(batchCount.toString().length)
            this.logger.info(`${itString} batch ` +
              `[${num}/${batchCount}]: ${timestamp(from)} -> ${timestamp(to)}`
            )
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

  // eslint-disable-next-line space-before-function-paren
  getAccounts() {
    return this.txSlicer.getBalances().map(b => {
      return {
        clientId: b.clientId,
        amount: b.xbt_balance,
        price: b.latestPrice,
        volume: b.gbp_balance,
        fullVolume: b.gbp_balance + roundVolume(b.xbt_balance, b.latestPrice)
      }
    })
  }
}

module.exports = PartitionWorker
