const PartitionWorker = require('../../backend/simrun/partitionWorker')

describe('Partition worker', () => {
  const slice = { unixNow: 100, transactions: [{ a: 2, price: 100 }, { a: 3, price: 100 }, { a: 4, price: 200 }] }

  const generatorConfig = {
    timeslotSeconds: { start: 100, end: 100, step: 50 },
    buying: {
      ratio: { start: 0, end: 2, step: 1 },
      useTimeslots: { start: 1, end: 1, step: 1 }
    },
    selling: {
      ratio: { start: 0, end: 1, step: 1 },
      useTimeslots: { start: 5, end: 5, step: 1 }
    },
    commonTraderConfig: { buying: { common: true } }
  }

  const workerConfig = {
    configsStartIx: 2,
    configsEndIx: 4,
    generatorConfig
  }

  const accountResponse = {
    clientId: 'test',
    balances: { gbp_balance: 1000, xbt_balance: 312 }
  }

  const expectedAccountResponse = {
    clientId: 'test',
    amount: 'Ƀ 0.0312',
    price: '£/Ƀ 2',
    volume: ''
  }

  const ExchangeAdapterMock = () => {
    let received

    const setTransactions = txs => { received = txs }
    const getReceived = () => received
    const getAccountSync = () => accountResponse

    return { setTransactions, getReceived, getAccountSync }
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
      return Promise.resolve()
    }

    return {
      tick, exchangeAdapter, calledTicks
    }
  }

  it('should run through full lifecycle', () => {
    const allTraderMocks = []
    const allClientIds = []

    const createSimulatedMocks = config => {
      config.buying.common.should.equal(true)
      const firstIndicator = config.buying.ratio
      const secondIndicator = config.selling.ratio

      switch (firstIndicator) {
        case 0: secondIndicator.should.equal(1)
          break
        case 1: secondIndicator.should.equal(1)
          break
        case 2: secondIndicator.should.equal(0)
          break
        default: throw Error('unexpeceted config indicator: ' + firstIndicator)
      }

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
    partitionWorker.createTraders(workerConfig)

    allTraderMocks.should.have.length(3)
    allClientIds.should.deep.equal([
      'T( 100)_B(   2 / 1)_S(   0 / 5)',
      'T( 100)_B(   0 / 1)_S(   1 / 5)',
      'T( 100)_B(   1 / 1)_S(   1 / 5)'
    ])

    partitionWorker.getAccounts().should.deep.equal([
      expectedAccountResponse, expectedAccountResponse, expectedAccountResponse
    ])

    return partitionWorker.drainTransactions(slice)
      .then(() => allTraderMocks.forEach(traderMock => {
        traderMock.calledTicks.should.deep.equal([100])
      }))
  })
})
