const PartitionWorker = require('../../backend/simrun/partitionWorker')

describe('Partition worker', () => {
  const slice = { unixNow: 100, transactions: [{ tid: 4, price: 500000 }, { tid: 3, price: 400000 }, { tid: 2, price: 400000 }] }

  const workerConfigObject = {
    traderConfigs: [{
      clientId: 'A',
      timeslotSeconds: 100,
      buying: { ratio: 0, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 5 }
    }, {
      clientId: 'B',
      timeslotSeconds: 100,
      buying: { ratio: 1, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 5 }
    }, {
      clientId: 'C',
      timeslotSeconds: 100,
      buying: { ratio: 2, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 5 }
    }]
  }

  const accountResponse = {
    clientId: 'test',
    balances: { gbp_balance: 1000, xbt_balance: 3120 }
  }

  const expectedAccounts = {
    clientId: 'test',
    amount: 3120,
    price: 500000,
    volume: 1000,
    fullVolume: 157000
  }

  const ExchangeAdapterMock = () => {
    let received

    const setTransactions = txs => { received = txs }
    const getReceived = () => received
    const getAccount = () => accountResponse

    return { setTransactions, getReceived, getAccount }
  }

  const TraderMock = () => {
    const exchangeAdapter = ExchangeAdapterMock()
    const calledTicks = []

    const tick = unixNow => {
      calledTicks.push(unixNow)
      if (unixNow === 100) {
        exchangeAdapter.getReceived().should.deep.equal(slice.transactions)
      } else {
        throw Error('unexpected unixNow: ' + unixNow)
      }
    }

    return {
      tick, exchangeAdapter, calledTicks
    }
  }

  it('should run through full lifecycle', () => {
    const allTraderMocks = []
    const allClientIds = []

    let workerConfigIx = 0

    const createSimulatedMocks = config => {
      config.should.deep.equal(workerConfigObject.traderConfigs[workerConfigIx++])
      if (allClientIds.includes(config.clientId)) {
        throw Error('duplicate client: ' + config.clientId)
      }

      const traderMock = TraderMock()
      allClientIds.push(config.clientId)
      allTraderMocks.push(traderMock)

      return {
        trader: traderMock,
        exchangeAdapter: traderMock.exchangeAdapter
      }
    }

    const partitionWorker = new PartitionWorker(createSimulatedMocks)
    partitionWorker.createTraders(workerConfigObject)

    allTraderMocks.should.have.length(3)
    allClientIds.should.deep.equal(['A', 'B', 'C'])

    partitionWorker.drainTransactions(slice)
    partitionWorker.getAccounts().should.deep.equal([
      expectedAccounts, expectedAccounts, expectedAccounts
    ], 'getAccounts not as expected')
    allTraderMocks.forEach(traderMock => {
      traderMock.calledTicks.should.deep.equal([100], 'tradermocks not called')
    })
  })
})
