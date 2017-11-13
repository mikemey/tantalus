/* global describe before beforeEach it */
const nock = require('nock')
const moment = require('moment')

const helpers = require('../helpers')
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
    let transactions
    const update = newTransactions => { transactions = newTransactions }
    const receivedTransaction = () => transactions

    return { update, receivedTransaction }
  }

  beforeEach(() => {
    testListener = createTestListener()
    transactionsService = TransactionsService(console, testConfig)
    transactionsService.addTransactionsListener(testListener.update)
  })

  afterEach(() => nock.cleanAll())

  const expectGetTransactions = transactions => nock(testHost).get(testPath)
    .reply(200, transactions)

  const unixTime = (minutesPast = 0) => moment.utc().subtract(minutesPast, 'm').unix()

  describe('(caching transactions)', () => {
    const setTransactionsToCache = (responseTransactions = []) => {
      const transactionsScope = expectGetTransactions(responseTransactions)
      return transactionsService.cacheTransactions()
        .then(() => transactionsScope.isDone().should.equal(true))
    }

    const expectCachedTransactions = expectedTransactions => () => {
      testListener.receivedTransaction().should.deep.equal(expectedTransactions)
    }

    it('ignores empty transactions response', () => {
      return setTransactionsToCache([])
        .then(expectCachedTransactions([]))
    })

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
      return setTransactionsToCache(testTransactions)
        .then(expectCachedTransactions(expectedTransactions))
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

      return setTransactionsToCache(firstTxs)
        .then(() => setTransactionsToCache(secondTxs))
        .then(expectCachedTransactions(expectedTransactions))
    })
  })

  describe('(storing transactions)', () => {
    beforeEach(helpers.dropDatabase)

    const setTransactionsToStore = (responseTransactions = []) => {
      const transactionsScope = expectGetTransactions(responseTransactions)
      return transactionsService.storeTransactions()
        .then(() => transactionsScope.isDone().should.equal(true))
    }

    const expectStoredTransactionsInOrder = expectedTransactions => () => helpers.getTransactions()
      .then(transactions => {
        transactions.should.have.length(expectedTransactions.length)
        const txsWithouId = helpers.copyWithoutIDField(transactions)
        txsWithouId
          .sort((a, b) => b.tid - a.tid)
          .should.deep.equal(expectedTransactions)
      })

    it('ignores empty transactions', () => setTransactionsToStore([])
      .then(expectStoredTransactionsInOrder([])))

    it('stores new transactions', () => {
      const testTransactions = [
        { amount: '2.0000', date: unixTime(2), price: '5624.00', tid: 1510215097665015 },
        { amount: '2.2924', date: unixTime(2), price: '5625.00', tid: 1510215097665838 },
        { amount: '0.0671', date: unixTime(), price: '5613.00', tid: 1510215239721367 }
      ]
      const expectedStoredTxs = [
        { amount: 671, date: testTransactions[2].date, price: 561300, tid: 1510215239721367 },
        { amount: 22924, date: testTransactions[1].date, price: 562500, tid: 1510215097665838 },
        { amount: 20000, date: testTransactions[0].date, price: 562400, tid: 1510215097665015 }
      ]
      return setTransactionsToStore(testTransactions)
        .then(expectStoredTransactionsInOrder(expectedStoredTxs))
    })

    it('stores transactions update', () => {
      const firstTxs = [
        { amount: '0.0671', date: unixTime(2), price: '5613.00', tid: 1510215239721367 },
        { amount: '2.2924', date: unixTime(3), price: '5625.00', tid: 1510215097665838 },
        { amount: '2.0000', date: unixTime(testTTL - 1), price: '5624.00', tid: 1510215097665015 },
        { amount: '0.0163', date: unixTime(testTTL + 1), price: '5622.00', tid: 1510215097664223 },
        { amount: '0.7563', date: unixTime(testTTL + 1), price: '5621.00', tid: 1510215097664220 }
      ]
      const secondTxs = helpers.copyWithoutIDField(firstTxs).concat([
        { amount: '0.1329', date: unixTime(), price: '5611.00', tid: 1510215239722434 }
      ])

      const expectedTransactions = [
        { amount: 1329, date: secondTxs[firstTxs.length].date, price: 561100, tid: 1510215239722434 },
        { amount: 671, date: firstTxs[0].date, price: 561300, tid: 1510215239721367 },
        { amount: 22924, date: firstTxs[1].date, price: 562500, tid: 1510215097665838 },
        { amount: 20000, date: firstTxs[2].date, price: 562400, tid: 1510215097665015 },
        { amount: 163, date: firstTxs[3].date, price: 562200, tid: 1510215097664223 },
        { amount: 7563, date: firstTxs[4].date, price: 562100, tid: 1510215097664220 }
      ]

      return setTransactionsToStore(firstTxs)
        .then(() => setTransactionsToStore(secondTxs))
        .then(expectStoredTransactionsInOrder(expectedTransactions))
    })

    it('stores transactions update with existing db data', () => {
      const dbTxs = [
        { amount: 671, date: unixTime(2), price: 561300, tid: 1510215239721367 },
        { amount: 22924, date: unixTime(3), price: 562500, tid: 1510215097665838 }
      ]
      const transactionsUpdate = [
        { amount: '0.1329', date: unixTime(), price: '5611.00', tid: 1510215239722434 },
        { amount: '0.0671', date: unixTime(2), price: '5613.00', tid: 1510215239721367 }
      ]

      const expectedTransactions = [
        { amount: 1329, date: transactionsUpdate[0].date, price: 561100, tid: 1510215239722434 },
        { amount: 671, date: dbTxs[0].date, price: 561300, tid: 1510215239721367 },
        { amount: 22924, date: dbTxs[1].date, price: 562500, tid: 1510215097665838 }
      ]

      return helpers.insertTransactions(dbTxs)
        .then(() => setTransactionsToStore(transactionsUpdate))
        .then(expectStoredTransactionsInOrder(expectedTransactions))
    })
  })
})
