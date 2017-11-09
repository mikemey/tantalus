/* global describe before beforeEach it */
const nock = require('nock')
const moment = require('moment')
const testLogger = require('../utils/testLogger')

const TransactionsService = require('../../backend/simex/transactionsService')

describe('Transaction service', () => {
  const testHost = 'http://localhost:14150'
  const testPath = '/transactions'
  const testTTL = 10
  const testConfig = {
    simex: {
      transactionsServiceUrl: testHost + testPath,
      transactionsTTLminutes: testTTL
    }
  }

  let transactionsService, testListener
  const createTestListener = () => {
    let transactions = []
    const update = newTransactions => { transactions = newTransactions }
    const receivedTransaction = () => transactions

    return { update, receivedTransaction }
  }

  beforeEach(() => {
    testListener = createTestListener()
    transactionsService = TransactionsService(testLogger, testConfig)
    transactionsService.addTransactionsListener(testListener.update)
  })

  const expectGetTransactions = transactions => nock(testHost).get(testPath)
    .reply(200, transactions)

  const unixTime = (minutesPast = 0) => moment.utc().subtract(minutesPast, 'm').unix()

  it('converts values (coinfloor -> SimEx) and sorts transactions by ID', () => {
    const testTransactions = [
      { amount: '2.0000', date: unixTime(2), price: '5624.00', tid: 1510215097665015 },
      { amount: '2.2924', date: unixTime(2), price: '5625.00', tid: 1510215097665838 },
      { amount: '0.0671', date: unixTime(), price: '5613.00', tid: 1510215239721367 }
    ]

    const expectedTransactions = [
      { amount: 671, date: testTransactions[2].date, price: 561300, tid: 1510215239721367 },
      { amount: 22924, date: testTransactions[1].date, price: 562500, tid: 1510215097665838 },
      { amount: 20000, date: testTransactions[0].date, price: 562400, tid: 1510215097665015 }
    ]

    const transactionsScope = expectGetTransactions(testTransactions)
    return transactionsService.updateTransactions()
      .then(() => {
        transactionsScope.isDone().should.equal(true)
        testListener.receivedTransaction().should.deep.equal(expectedTransactions)
      })
  })

  it('removes outdated transactions and adds new ones', () => {
    const firstTxs = [
      { amount: '0.0671', date: unixTime(2), price: '5613.00', tid: 1510215239721367 },
      { amount: '2.2924', date: unixTime(3), price: '5625.00', tid: 1510215097665838 },
      { amount: '2.0000', date: unixTime(testTTL - 1), price: '5624.00', tid: 1510215097665015 },
      { amount: '0.0163', date: unixTime(testTTL + 1), price: '5622.00', tid: 1510215097664223 }
    ]
    const secondTxs = [
      firstTxs[0], firstTxs[1], firstTxs[2], firstTxs[3],
      { amount: '0.1329', date: unixTime(), price: '5611.00', tid: 1510215239722434 },
      { amount: '0.7563', date: unixTime(testTTL + 1), price: '5621.00', tid: 1510215097664220 }
    ]

    const expectedTransactions = [
      { amount: 1329, date: secondTxs[4].date, price: 561100, tid: 1510215239722434 },
      { amount: 671, date: firstTxs[0].date, price: 561300, tid: 1510215239721367 },
      { amount: 22924, date: firstTxs[1].date, price: 562500, tid: 1510215097665838 },
      { amount: 20000, date: firstTxs[2].date, price: 562400, tid: 1510215097665015 }
    ]

    const firstGet = expectGetTransactions(firstTxs)
    const secondGet = expectGetTransactions(secondTxs)
    return transactionsService.updateTransactions()
      .then(transactionsService.updateTransactions)
      .then(() => {
        firstGet.isDone().should.equal(true)
        secondGet.isDone().should.equal(true)
        testListener.receivedTransaction().should.deep.equal(expectedTransactions)
      })
  })
})
