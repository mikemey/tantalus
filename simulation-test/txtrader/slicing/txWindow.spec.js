const expect = require('chai').expect

const TransactionWindow = require('../../../simulation/txtrader/slicing/txWindow')

describe('Transaction Window', () => {
  const testUpdateSeconds = 100
  const workerConfigs = {
    traderConfigs: [{
      clientId: 'A',
      timeslotSeconds: 150,
      buying: { ratio: 0, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 2 }
    }, {
      clientId: 'B',
      timeslotSeconds: 100,
      buying: { ratio: 1, useTimeslots: 3 },
      selling: { ratio: 0, useTimeslots: 4 }
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

  const dbBatch4 = [
    { tid: 730200, date: 730 }
  ]

  const expected = [{
    nextUpdateFull: true, // current unixDate 329
    txsUpdate: [dbBatch1[0], dbBatch1[1], dbBatch1[2]],
    slotsWindow: [dbBatch1[2], dbBatch1[1], dbBatch1[0]]
  }, {
    nextUpdateFull: false, // current unixDate 429
    txsUpdate: [],
    slotsWindow: [dbBatch1[2], dbBatch1[1], dbBatch1[0]]
  }, {
    nextUpdateFull: false, // current unixDate 529
    txsUpdate: [dbBatch1[3], dbBatch2[0]],
    slotsWindow: [dbBatch2[0], dbBatch1[3], dbBatch1[2], dbBatch1[1], dbBatch1[0]]
  }, {
    nextUpdateFull: false, // current unixDate 629
    txsUpdate: [],
    slotsWindow: [dbBatch2[0], dbBatch1[3], dbBatch1[2], dbBatch1[1], dbBatch1[0]]
  }, {
    nextUpdateFull: false, // current unixDate 729
    txsUpdate: [dbBatch3[0], dbBatch3[1]],
    slotsWindow: [dbBatch3[1], dbBatch3[0], dbBatch2[0], dbBatch1[3]]
  }, {
    nextUpdateFull: false, // current unixDate 829
    txsUpdate: [dbBatch4[0]],
    slotsWindow: [dbBatch4[0], dbBatch3[1], dbBatch3[0], dbBatch2[0], dbBatch1[3]]
  }]

  it('should return tx windows', () => {
    const txWindow = TransactionWindow(workerConfigs, testUpdateSeconds)
    txWindow.addBatchUpdate(230, 430, dbBatch1)
    txWindow.nextTransactionUpdate().should.deep.equal(expected[0])
    txWindow.nextTransactionUpdate().should.deep.equal(expected[1])
    txWindow.addBatchUpdate(450, 549, dbBatch2)
    txWindow.nextTransactionUpdate().should.deep.equal(expected[2])
    txWindow.addBatchUpdate(550, 728, dbBatch3)
    txWindow.nextTransactionUpdate().should.deep.equal(expected[3])
    txWindow.nextTransactionUpdate().should.deep.equal(expected[4])
    txWindow.addBatchUpdate(729, 800, dbBatch4)
    txWindow.nextTransactionUpdate().should.deep.equal(expected[5])
  })

  it('throws exception when maximum slots window is NOT divisible by transactionsUpdateSeconds', () => {
    const workerConfigs = {
      traderConfigs: [{
        clientId: 'A',
        timeslotSeconds: 125,
        buying: { ratio: 0, useTimeslots: 1 },
        selling: { ratio: 0, useTimeslots: 5 }
      }, {
        clientId: 'B',
        timeslotSeconds: 100,
        buying: { ratio: 1, useTimeslots: 3 },
        selling: { ratio: 0, useTimeslots: 4 }
      }]
    }
    expect(() => TransactionWindow(workerConfigs, testUpdateSeconds))
      .to.throw(Error, 'transactionUpdateSeconds (100) is not a divisor of maximum slots window size (625)')
  })
})
