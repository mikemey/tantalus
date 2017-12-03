const mongo = require('../../utils/mongoConnection')

const { timestamp } = require('../simrunUtils')
const { TantalusLogger } = require('../../utils/tantalusLogger')
const { roundVolume } = require('../../utils/ordersHelper')
const { executorConfig } = require('../simrunConfig')

const TransactionRepo = require('../../transactions/transactionsRepo')
const TransactionsSource = require('./txSource')
const TransactionSlicer = require('./txSlicer')

const baseLogger = console

class PartitionWorker {
  // eslint-disable-next-line space-before-function-paren
  constructor() {
    this.traderPairs = []
    this.lastTransactionPrice = 0
    this.logger = TantalusLogger(baseLogger, `worker-${process.pid}`)
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
  createTraders(workerConfigObject) {
    return mongo.initializeDirectConnection(executorConfig, this.logger)
      .then(() => {
        this.txSlicer = TransactionSlicer(this.logger, workerConfigObject, executorConfig.transactionsUpdateSeconds)
        this.lastTransactionPrice = 0

        this.txsrc = TransactionsSource(this.logger, TransactionRepo())
        return this.txsrc.reset(executorConfig.batchSeconds)
      })
      .catch(this.errorHandler('Partition worker (creating traders): '))
  }

  // eslint-disable-next-line space-before-function-paren
  runIteration(iterationProgress) {
    const itString = `[it-${iterationProgress}]`
    const runIterationPromise = () => {
      if (this.txsrc.hasNext()) {
        this.logger.info('reading transactions...')
        return this.txsrc.next()
          .then(({ batchNum, from, to, transactions }) => {
            const num = batchNum.toString().padStart(this.txsrc.batchCount().toString().length)
            this.logger.info(`${itString} batch ` +
              `[${num}/${this.txsrc.batchCount()}]: ${timestamp(from)} -> ${timestamp(to)}`
            )
            this.lastTransactionPrice = transactions[transactions.length - 1].price
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
    return this.traderPairs.map(({ trader, exchangeAdapter }) => {
      const account = exchangeAdapter.getAccount()
      return {
        clientId: account.clientId,
        amount: account.balances.xbt_balance,
        price: this.lastTransactionPrice,
        volume: account.balances.gbp_balance,
        fullVolume: account.balances.gbp_balance +
          roundVolume(account.balances.xbt_balance, this.lastTransactionPrice)
      }
    })
  }
}

module.exports = PartitionWorker
