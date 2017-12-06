const expect = require('chai').expect

const TransactionWindow = require('../../../simulation/txtrader/slicing/txWindow')

describe('Transaction Window', () => {
  const testUpdateSeconds = 100
  const traderConfigs = [{
    timeslotSeconds: 200,
    buying: { ratio: 0, useTimeslots: 2 },
    selling: { ratio: 0, useTimeslots: 2 }
  }, {
    timeslotSeconds: 100,
    buying: { ratio: 1, useTimeslots: 3 },
    selling: { ratio: 0, useTimeslots: 3 }
  }]

  const dbBatch0 = [
    { tid: 230000, date: 230 },
    { tid: 280302, date: 280 },
    { tid: 280610, date: 280 },
    { tid: 430000, date: 430 }
  ]

  const dbBatch1 = [
    { tid: 529000, date: 529 }
  ]

  const dbBatch2 = [
    { tid: 630100, date: 630 },
    { tid: 630200, date: 630 }
  ]

  const dbBatch3 = [
    { tid: 730200, date: 730 }
  ]

  const createSlotsIndices = indicesArray => {
    const dateIndices = new Map()
    indicesArray.forEach(indexEntry => dateIndices.set(indexEntry[0], indexEntry[1]))
    return dateIndices
  }

  const expected = [{
    nextUpdateFull: true,
    txsUpdate: [dbBatch0[0], dbBatch0[1], dbBatch0[2]],
    transactions: [dbBatch0[0], dbBatch0[1], dbBatch0[2], dbBatch0[3]],
    slotEndDate: 329,
    slotsIndices: createSlotsIndices([
      [-71, 0], [29, 0], [129, 0], [229, 0], [329, 3]
    ])
  }, {
    nextUpdateFull: false,
    txsUpdate: [],
    transactions: [dbBatch0[0], dbBatch0[1], dbBatch0[2], dbBatch0[3]],
    slotEndDate: 429,
    slotsIndices: createSlotsIndices([
      [29, 0], [129, 0], [229, 0], [329, 3], [429, 3]
    ])
  }, {
    nextUpdateFull: false,
    txsUpdate: [dbBatch0[3], dbBatch1[0]],
    transactions: [dbBatch0[0], dbBatch0[1], dbBatch0[2], dbBatch0[3], dbBatch1[0]],
    slotEndDate: 529,
    slotsIndices: createSlotsIndices([
      [129, 0], [229, 0], [329, 3], [429, 3], [529, 5]
    ])
  }, {
    nextUpdateFull: false,
    txsUpdate: [],
    transactions: [
      dbBatch0[0], dbBatch0[1], dbBatch0[2], dbBatch0[3],
      dbBatch1[0], dbBatch2[0], dbBatch2[1]
    ],
    slotEndDate: 629,
    slotsIndices: createSlotsIndices([
      [229, 0], [329, 3], [429, 3], [529, 5], [629, 5]
    ])
  }, {
    nextUpdateFull: false,
    txsUpdate: [dbBatch2[0], dbBatch2[1]],
    transactions: [
      dbBatch0[3],
      dbBatch1[0], dbBatch2[0], dbBatch2[1], dbBatch3[0]
    ],
    slotEndDate: 729,
    slotsIndices: createSlotsIndices([
      [329, 0], [429, 0], [529, 2], [629, 2], [729, 4]
    ])
  }, {
    nextUpdateFull: false,
    txsUpdate: [dbBatch3[0]],
    transactions: [
      dbBatch0[3],
      dbBatch1[0], dbBatch2[0], dbBatch2[1], dbBatch3[0]
    ],
    slotEndDate: 829,
    slotsIndices: createSlotsIndices([
      [429, 0], [529, 2], [629, 2], [729, 4], [829, 5]
    ])
  }]

  it('should return tx windows', () => {
    const txWindow = TransactionWindow(traderConfigs, testUpdateSeconds)
    txWindow.addBatchUpdate(230, 430, dbBatch0)
    txWindow.nextTransactionUpdate().should.deep.equal(expected[0])
    txWindow.nextTransactionUpdate().should.deep.equal(expected[1])
    txWindow.addBatchUpdate(450, 549, dbBatch1)
    txWindow.nextTransactionUpdate().should.deep.equal(expected[2])
    txWindow.addBatchUpdate(550, 728, dbBatch2)
    txWindow.nextTransactionUpdate().should.deep.equal(expected[3])
    txWindow.addBatchUpdate(729, 800, dbBatch3)
    txWindow.nextTransactionUpdate().should.deep.equal(expected[4])
    txWindow.nextTransactionUpdate().should.deep.equal(expected[5])
  })

  it('throws exception when timeslotSeconds is NOT divisible by transactionsUpdateSeconds', () => {
    const traderConfigs = [{
      timeslotSeconds: 150,
      buying: { ratio: 0, useTimeslots: 1 },
      selling: { ratio: 0, useTimeslots: 2 }
    }, {
      timeslotSeconds: 100,
      buying: { ratio: 1, useTimeslots: 3 },
      selling: { ratio: 0, useTimeslots: 4 }
    }]

    expect(() => TransactionWindow(traderConfigs, testUpdateSeconds))
      .to.throw(Error, 'transactionUpdateSeconds (100) is not a divisor of timeslotSeconds (150)')
  })
})
