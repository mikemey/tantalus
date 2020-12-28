const deepAssign = require('assign-deep')
const lodash = require('lodash')

const { TantalusLogger } = require('../../utils/tantalusLogger')
const { volumeString } = require('../../utils/ordersHelper')

const { clientId, padNumStart, countDecimals } = require('./traderConfigUtils')
const TraderConfigGenerator = require('./traderConfigGenerator')

const PermutatorRandom = () => {
  const number = maxExclusive => Math.floor(Math.random() * maxExclusive)

  const trigger = ratio => Math.random() > ratio
  const plusMinus = () => Math.random() > 0.5 ? 1 : -1

  const shuffle = lodash.shuffle

  return {
    number, trigger, plusMinus, shuffle
  }
}

const checkGenAlgoConfig = config => {
  if (!config.problemSpaceRanges) throwError('problemSpaceRanges')
  if (!config.iterations) throwError('iterations')
  if (!config.minSelectionCutoff) throwError('minSelectionCutoff')
  if (!config.crossoverRate) throwError('crossoverRate')
  if (!config.mutationRate) throwError('mutationRate')
  if (!config.mutationBoundaries) throwError('mutationBoundaries')
}

const throwError = name => {
  throw Error(`${name} not configured!`)
}

const TraderConfigPermutator = (baseLogger, simulatioId, genAlgoConfig, random = PermutatorRandom()) => {
  checkGenAlgoConfig(genAlgoConfig)
  const logger = TantalusLogger(baseLogger, 'CfgPermut')

  const problemSpace = genAlgoConfig.problemSpaceRanges
  const traderConfigGenerator = TraderConfigGenerator().createGenerator(problemSpace)

  const minSelectionCutoff = genAlgoConfig.minSelectionCutoff
  const crossoverRate = genAlgoConfig.crossoverRate
  const mutationRate = genAlgoConfig.mutationRate
  const boundaries = genAlgoConfig.mutationBoundaries

  const iterations = genAlgoConfig.iterations
  const iterationDigits = iterations.toString().length

  const data = {
    currentIteration: 1
  }

  const currentIteration = () => data.currentIteration
  const progressString = () => `${padNumStart(data.currentIteration, iterationDigits)}/${iterations}`

  const hasNext = () => data.currentIteration < iterations

  const nextGeneration = (accounts, fitnessLimit, traderConfigs) => {
    const parentPopulation = extractParentPopulation(accounts, fitnessLimit, traderConfigs)
    logTotalFitnessOf(parentPopulation)

    const nextGenConfigs = pairupParents(parentPopulation)
      .reduce(breedNextGeneration, [])
      .map(mutateAlleles)
      .map(generateClientIds)
      .map(expandTraderConfigs)
      .map(addCommonTraderConfig)

    const diversity = diversityImmigration(traderConfigs.length - nextGenConfigs.length)

    const nextGen = nextGenConfigs.concat(diversity)
    data.currentIteration++
    return random.shuffle(nextGen)
  }

  const genes = ['ts', 'bratio', 'bslots', 'sratio', 'sslots']

  const fitnessOf = account => account.fullVolume

  const extractParentPopulation = (accounts, fitnessLimit, traderConfigs) => {
    const maxCutoff = (1 - minSelectionCutoff) * accounts.length

    const performers = accounts
      .filter(account => fitnessOf(account) > fitnessLimit)
      .slice(0, maxCutoff)
      .map(flattenTraderConfig(traderConfigs))

    const totalParentsFitness = performers
      .reduce((totalFitness, parent) => totalFitness + parent.fitness, 0)

    let cumulatedFitness = 0
    const rouletteWheel = performers.map(parent => {
      cumulatedFitness += parent.fitness
      return cumulatedFitness / totalParentsFitness
    })

    return performers.reduce((pickedParents, _) => {
      const spin = random.number(1)
      const parentsIx = rouletteWheel.findIndex(wheelValue => wheelValue > spin)
      pickedParents.push(performers[parentsIx])
      return pickedParents
    }, [])
  }

  const flattenTraderConfig = traderConfigs => account => {
    const traderConfig = traderConfigs.find(cfg => cfg.clientId === account.clientId)
    const fitness = fitnessOf(account)
    return {
      fitness,
      ts: traderConfig.timeslotSeconds,
      bratio: traderConfig.buying.ratio,
      bslots: traderConfig.buying.useTimeslots,
      sratio: traderConfig.selling.ratio,
      sslots: traderConfig.selling.useTimeslots
    }
  }

  const logLastParentsFitness = (accounts, traderConfigs) => {
    logTotalFitnessOf(extractParentPopulation(accounts, traderConfigs))
  }

  const logTotalFitnessOf = parentPopulation => {
    const totalFitness = parentPopulation.reduce((total, trader) => {
      total += trader.fitness
      return total
    }, 0)
    logger.info(
      `parents [${simulatioId}:${data.currentIteration}] ` +
      `count: [${parentPopulation.length}], total fitness: ${volumeString(totalFitness)}`
    )
  }

  const expandTraderConfigs = flatTraderConfig => {
    return {
      clientId: flatTraderConfig.clientId,
      timeslotSeconds: flatTraderConfig.ts,
      buying: {
        ratio: flatTraderConfig.bratio,
        useTimeslots: flatTraderConfig.bslots
      },
      selling: {
        ratio: flatTraderConfig.sratio,
        useTimeslots: flatTraderConfig.sslots
      }
    }
  }

  const pairupParents = parentPopulation => {
    const results = parentPopulation
      .reduce((results, parent, ix) => {
        results.currentPair.push(parent)
        if (results.currentPair.length >= 2) {
          results.parents.push(results.currentPair)
          results.currentPair = []
        }
        return results
      }, { parents: [], currentPair: [] })

    if (results.currentPair.length !== 0) {
      results.parents.push(results.currentPair)
    }
    return results.parents
  }

  const breedNextGeneration = (nextgen, parents) => {
    const children = parents.length < 2
      ? [lodash.pick(parents[0], genes)]
      : genes.reduce((children, gene) => {
        const p1Gene = parents[0][gene]
        const p2Gene = parents[1][gene]
        const newgenes = random.trigger(crossoverRate)
          ? crossoverGene(p1Gene, p2Gene)
          : keepGene(p1Gene, p2Gene)
        children[0][gene] = newgenes[0]
        children[1][gene] = newgenes[1]
        return children
      }, [{}, {}])

    nextgen.push(...children)
    return nextgen
  }

  const crossoverGene = (p1Gene, p2Gene) => {
    return [p2Gene, p1Gene]
  }

  const keepGene = (p1Gene, p2Gene) => {
    return [p1Gene, p2Gene]
  }

  const snapAlleleToSteps = (gene, allele) => {
    const step = boundaries[gene].step
    const steppedAllele = step * Math.round(allele / step)
    return roundToStepDecimals(steppedAllele, step)
  }

  const roundToStepDecimals = (allele, step) => {
    const multipier = Math.pow(10, countDecimals(step))
    return Math.round(allele * multipier) / multipier
  }

  const mutateAlleles = chromosome => {
    if (random.trigger(mutationRate)) {
      const mutateGene = genes[random.number(genes.length)]

      const alleleMutationStepsMax = boundaries[mutateGene].mutationStepsMax + 1
      const alleleMutationMin = boundaries[mutateGene].start !== undefined
        ? boundaries[mutateGene].start
        : Number.MIN_SAFE_INTEGER

      const mutation = snapAlleleToSteps(mutateGene,
        chromosome[mutateGene] +
        random.plusMinus() * random.number(alleleMutationStepsMax) * boundaries[mutateGene].step
      )

      chromosome[mutateGene] = Math.max(alleleMutationMin, mutation)
    }
    return chromosome
  }

  const generateClientIds = traderConfig => {
    traderConfig.clientId = clientId(traderConfig.ts,
      traderConfig.bratio, traderConfig.bslots,
      traderConfig.sratio, traderConfig.sslots)
    return traderConfig
  }

  const addCommonTraderConfig = traderConfig => {
    return deepAssign(traderConfig, problemSpace.commonTraderConfig)
  }

  const diversityImmigration = count => {
    const totalCount = traderConfigGenerator.length
    return Array.from({ length: count }, (_, ix) => {
      return traderConfigGenerator.nth(random.number(totalCount))
    })
  }

  return {
    hasNext,
    currentIteration,
    progressString,
    nextGeneration,
    logLastParentsFitness
  }
}

module.exports = TraderConfigPermutator
