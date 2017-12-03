const TransactionWindow = require('../../../simulation/txtrader/slicing/txWindow')

describe('Transaction Window', () => {
  const testUpdateSeconds = 100
  const workerConfigs = {
    traderConfigs: [{
      clientId: 'A',
      timeslotSeconds: 300,
      buying: { ratio: 0, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 3 }
    }, {
      clientId: 'B',
      timeslotSeconds: 100,
      buying: { ratio: 1, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 4 }
    }, {
      clientId: 'C',
      timeslotSeconds: 300,
      buying: { ratio: 2, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 2 }
    }]
  }

  const dbBatch1 = [
    { tid: 230000, date: 230 },
    { tid: 280302, date: 280 },
    { tid: 280610, date: 280 },
    { tid: 430000, date: 430 }
  ]

  const dbBatch2 = [
    { tid: 529000, date: 529 }
  ]

  const dbBatch3 = [
    { tid: 630100, date: 630 },
    { tid: 630200, date: 630 }
  ]

  const expected = [{
    nextUpdateFull: true, // current unixDate 329
    txsUpdate: [dbBatch1[0], dbBatch1[1], dbBatch1[2]],
    txsWindow: [dbBatch1[2], dbBatch1[1], dbBatch1[0]]
  }, {
    nextUpdateFull: false, // current unixDate 429
    txsUpdate: [],
    txsWindow: [dbBatch1[2], dbBatch1[1], dbBatch1[0]]
  }, {
    nextUpdateFull: false, // current unixDate 529
    txsUpdate: [dbBatch1[3], dbBatch2[0]],
    txsWindow: [dbBatch2[0], dbBatch1[3], dbBatch1[2], dbBatch1[1], dbBatch1[0]]
  }, {
    nextUpdateFull: true, // current unixDate 629
    txsUpdate: [],
    txsWindow: [dbBatch2[0], dbBatch1[3], dbBatch1[2], dbBatch1[1], dbBatch1[0]]
  }, {
    nextUpdateFull: false, // current unixDate 729
    txsUpdate: [dbBatch3[0], dbBatch3[1]],
    txsWindow: [dbBatch3[1], dbBatch3[0], dbBatch2[0], dbBatch1[3]]
  }]

  it.only('should return txsUpdat', () => {
    const txWindow = TransactionWindow(workerConfigs, testUpdateSeconds)
    txWindow.addBatchUpdate(dbBatch1)
    txWindow.getTransactionUpdate().should.deep.equal(expected[0])
    txWindow.getTransactionUpdate().should.deep.equal(expected[1])
    txWindow.addBatchUpdate(dbBatch2)
    txWindow.getTransactionUpdate().should.deep.equal(expected[2])
    txWindow.addBatchUpdate(dbBatch3)
    txWindow.getTransactionUpdate().should.deep.equal(expected[3])
    txWindow.getTransactionUpdate().should.deep.equal(expected[4])
  })
})
