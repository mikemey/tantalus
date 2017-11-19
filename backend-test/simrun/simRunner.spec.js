const SimRunner = require('../../backend/simrun/simRunner')

describe('Sim Runner', () => {
  const txsUpdateSeconds = 100
  const firstBatch = [{ date: 100, a: 2 }, { date: 200, a: 3 }, { date: 249, a: 4 }]
  const secondBatch = [{ date: 299, a: 5 }, { date: 500, a: 6 }]

  const TransactionSourceMock = () => {
    let batchIx = 0
    const batches = [
      { from: 100, to: 249, transactions: firstBatch },
      { from: 250, to: 599, transactions: secondBatch }
    ]

    const hasNext = () => batchIx < batches.length
    const next = () => Promise.resolve(batches[batchIx++])
    return { next, hasNext }
  }

  const ExchangeAdapterMock = () => {
    let received

    const setTransactions = txs => { received = txs }
    const getReceived = () => received
    const getAccountSync = () => {
      return {
        clientId: 'test',
        balances: { gbp_balance: 1, xbt_balance: 1 }
      }
    }
    return { setTransactions, getReceived, getAccountSync }
  }

  const TraderMock = () => {
    const exchangeAdapter = ExchangeAdapterMock()
    const calledTicks = []

    const tick = unixNow => {
      calledTicks.push(unixNow)
      switch (unixNow) {
        case 199: exchangeAdapter.getReceived().should.deep.equal([firstBatch[0]])
          break
        case 299: exchangeAdapter.getReceived().should.deep.equal([
          firstBatch[1], firstBatch[2], secondBatch[0]
        ])
          break
        case 399:
        case 499:
          exchangeAdapter.getReceived().should.deep.equal([])
          break
        case 599: exchangeAdapter.getReceived().should.deep.equal([secondBatch[1]])
          break
        default: throw Error('unexpected unixNow: ' + unixNow)
      }
      return Promise.resolve()
    }

    return {
      tick, exchangeAdapter, calledTicks
    }
  }

  it('runs batches of transactions against traders', () => {
    const traderMock = TraderMock()

    const mockTraderPairs = () => {
      return {
        map: () => {
          return [{ trader: traderMock, exchangeAdapter: traderMock.exchangeAdapter }]
        }
      }
    }

    const simRunner = SimRunner(console, TransactionSourceMock(), mockTraderPairs(), txsUpdateSeconds)

    return simRunner.run()
      .then(() => {
        traderMock.calledTicks.should.deep.equal([199, 299, 399, 499, 599])
      })
  })
})
