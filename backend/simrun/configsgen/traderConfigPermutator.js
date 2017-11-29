const deepAssign = require('assign-deep')

const { clientId } = require('./traderConfigUtils')
const TraderConfigsGenerator = require('./traderConfigsGenerator')

const PermutatorRandom = () => {
  const number = () => {

  }
  const trigger = () => {

  }
  const plusMinus = () => {
  }
  return {
    number, trigger, plusMinus
  }
}

const TraderConfigPermutator = (genAlgoConfig, random = PermutatorRandom()) => {
  const problemSpace = genAlgoConfig.problemSpaceRanges
  const traderConfigsGenerator = TraderConfigsGenerator()
    .createGenerator(problemSpace)

  const iterations = genAlgoConfig.iterations
  const selectionCutoff = genAlgoConfig.selectionCutoff
  const crossoverRate = genAlgoConfig.crossoverRate
  const mutationRate = genAlgoConfig.mutationRate
  const boundaries = genAlgoConfig.mutationBoundaries

  const hasNext = () => { }

  const currentIteration = () => { }

  const nextGeneration = (accounts, traderConfigs) => {
    const parentPopulation = extractParentPopulation(accounts, traderConfigs)
    const nextGenConfigs = pairupParents(parentPopulation)
      .reduce(breedNextGeneration, [])
      .map(mutateAlleles)
      .map(generateClientIds)
      .map(expandTraderConfigs)
      .map(addCommonTraderConfig)

    return nextGenConfigs.concat(diversityImmigration(traderConfigs.length - nextGenConfigs.length))
  }

  const genes = ['ts', 'bratio', 'bslots', 'sratio', 'sslots']

  const extractParentPopulation = (accounts, traderConfigs) => accounts
    .sort((accA, accB) => accB.fullVolume - accA.fullVolume)
    .slice(0, (accounts.length * (selectionCutoff)))
    .map(flattenTraderConfig(traderConfigs))

  const flattenTraderConfig = traderConfigs => account => {
    const traderConfig = traderConfigs.find(cfg => cfg.clientId === account.clientId)
    const fitness = account.fullVolume
    return {
      fitness,
      ts: traderConfig.timeslotSeconds,
      bratio: traderConfig.buying.ratio,
      bslots: traderConfig.buying.useTimeslots,
      sratio: traderConfig.selling.ratio,
      sslots: traderConfig.selling.useTimeslots
    }
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
    const parents = []
    while (parentPopulation.length) {
      const pickedIx = random.number(parentPopulation.length)
      const parent = parentPopulation.splice(pickedIx, 1)[0]
      parents.push(parent)
    }

    const results = parents
      .reduce((results, parent, ix) => {
        results.currentPair.push(parent)
        if (results.currentPair.length >= 2) {
          results.parents.push(results.currentPair)
          results.currentPair = []
        }
        return results
      }, { parents: [], currentPair: [] })

    switch (results.currentPair.length) {
      case 0: break
      case 1:
        results.currentPair.push(results.currentPair[0])
        results.parents.push(results.currentPair)
        break
      case 2:
        results.parents.push(results.currentPair)
    }
    return results.parents
  }

  const breedNextGeneration = (nextgen, parents) => {
    const children = genes.reduce((children, gene) => {
      const p1Gene = parents[0][gene]
      const p2Gene = parents[1][gene]
      const newgenes = random.trigger(crossoverRate)
        ? crossoverGene(p1Gene, p2Gene)
        : averageGene(gene, parents[0], parents[1])
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
  const averageGene = (gene, parentA, parentB) => {
    const weightedAllele =
      (parentA[gene] * parentA.fitness + parentB[gene] * parentB.fitness) /
      (parentA.fitness + parentB.fitness)

    const step = boundaries[gene].step
    const weightedAlleleStep = step * Math.round(weightedAllele / step)
    return [weightedAlleleStep, weightedAlleleStep]
  }

  const mutateAlleles = chromosome => {
    if (random.trigger(mutationRate)) {
      const mutateGene = genes[random.number(genes.length)]

      const alleleMutationMax = boundaries[mutateGene].mutationMax + 1
      const alleleMutationMin = boundaries[mutateGene].start !== undefined
        ? boundaries[mutateGene].start : Number.MIN_SAFE_INTEGER

      chromosome[mutateGene] = Math.max(
        alleleMutationMin,
        chromosome[mutateGene] + random.plusMinus() * random.number(alleleMutationMax)
      )
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
    const totalCount = traderConfigsGenerator.length
    return Array.from({ length: count }, (_, ix) => {
      return traderConfigsGenerator.nth(random.number(totalCount))
    })
  }

  return {
    hasNext,
    currentIteration,
    nextGeneration
  }
}

module.exports = TraderConfigPermutator
