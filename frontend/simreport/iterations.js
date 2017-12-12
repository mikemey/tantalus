/* global THREE requestAnimationFrame */

const maxLength = 150
const maxWidth = 100

const minHeight = 0
const maxHeight = 50

const additionalAxisLength = 30
const boundingBoxColor = 0xFFD993

const heightColorComponents = normalizedHeight => {
  const color = { r: 1.0, g: 1.0, b: 1.0 }

  if (normalizedHeight < minHeight) normalizedHeight = minHeight
  if (normalizedHeight > maxHeight) normalizedHeight = maxHeight
  const dv = maxHeight - minHeight

  if (normalizedHeight < (minHeight + 0.25 * dv)) {
    color.r = 0
    color.g = 4 * (normalizedHeight - minHeight) / dv
  } else if (normalizedHeight < (minHeight + 0.5 * dv)) {
    color.r = 0
    color.b = 1 + 4 * (minHeight + 0.25 * dv - normalizedHeight) / dv
  } else if (normalizedHeight < (minHeight + 0.75 * dv)) {
    color.r = 4 * (normalizedHeight - minHeight - 0.5 * dv) / dv
    color.b = 0
  } else {
    color.g = 1 + 4 * (minHeight + 0.75 * dv - normalizedHeight) / dv
    color.b = 0
  }
  return [color.r, color.g, color.b]
}

const axisDatas = [
  { name: 'x-axis', color: 0xFF0000, x: maxLength + additionalAxisLength, y: 0, z: 0 },
  { name: 'y-axis', color: 0x00FF00, x: 0, y: maxWidth + additionalAxisLength, z: 0 },
  { name: 'z-axis', color: 0x0000FF, x: 0, y: 0, z: maxHeight + additionalAxisLength }
]

const createCoordinateSystem = () => {
  const coordSys = new THREE.Group()
  axisDatas.map(createAxisLine).forEach(line => coordSys.add(line))
  return coordSys
}

const createAxisLine = axisData => {
  const material = new THREE.LineBasicMaterial({ color: axisData.color })
  const geometry = new THREE.Geometry()
  geometry.vertices.push(new THREE.Vector3(0, 0, 0))
  geometry.vertices.push(new THREE.Vector3(axisData.x, axisData.y, axisData.z))
  return new THREE.Line(geometry, material)
}

const boundingBox = () => {
  const geometry = new THREE.BufferGeometry()
  const vertices = new Float32Array([
    maxLength, maxWidth, 0,
    maxLength, 0, 0,
    maxLength, 0, maxHeight,
    maxLength, maxWidth, maxHeight,
    maxLength, maxWidth, 0,
    0, maxWidth, 0,
    0, maxWidth, maxHeight,
    maxLength, maxWidth, maxHeight,
    0, maxWidth, maxHeight,
    0, 0, maxHeight
  ])
  geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3))

  const material = new THREE.LineBasicMaterial({ color: boundingBoxColor })
  return new THREE.Line(geometry, material)
}

const iterationLines = (iterationData) => {
  const allLines = new THREE.Group()

  const material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors })

  const lengthRatio = maxLength / Math.max(...iterationData.map(it => it.investDiffs.length))
  const widthRatio = maxWidth / iterationData.length
  const heightRatio = maxHeight / Math.max(...iterationData
    .map(it => Math.max(...it.investDiffs))
  )

  const createLine = createIterationLine(material, lengthRatio, widthRatio, heightRatio)
  iterationData.forEach(iteration => {
    allLines.add(createLine(iteration))
  })

  return allLines
}

const createIterationLine = (material, lengthRatio, widthRatio, heightRatio) => iteration => {
  const geometry = new THREE.BufferGeometry()
  const y = iteration.ix * widthRatio
  const { positions, colors } = iteration.investDiffs.reduce((positionColors, diff, ix) => {
    const x = maxLength - (ix * lengthRatio)
    const z = diff * heightRatio
    positionColors.positions.push(x, y, z)
    positionColors.colors.push(...heightColorComponents(z))

    return positionColors
  }, { positions: [], colors: [] })

  geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return new THREE.Line(geometry, material)
}

const createTestData = () => {
  const data = []
  const itCount = 40

  const maxDiff = 3000
  let diffNum = 7
  const maxDiffNum = 100
  const diffSteps = (maxDiffNum - diffNum) / itCount
  for (let ix = 0; ix < itCount; ix++) {
    const investDiffs = Array.from({ length: diffNum }, (_, i) => Math.random() * maxDiff)
      .sort((a, b) => b - a)

    diffNum += diffSteps
    data.push({
      ix,
      investDiffs
    })
  }
  return data
}

const iterationsControllerName = 'IterationsController'

const IterationsController = function ($scope, $document) {
  const data = {
    renderer: null,
    camera: null,
    scene: null,
    orbitControls: null,
    canvasDiv: angular.element('#itcontainer')
  }

  const setup = () => {
    data.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: $document.find('#itcanvas')[0]
    })

    data.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000)
    data.camera.position.set(maxLength * 0.6, -maxWidth * 0.8, maxHeight * 2)
    const lookAt = new THREE.Vector3(maxLength * 0.6, maxWidth * 0.7, 0)

    data.orbitControls = new THREE.OrbitControls(data.camera, data.renderer.domElement, lookAt)

    createScene()
    resizeRenderer()
    data.renderer.render(data.scene, data.camera)
    createSizeListener()
  }

  const createScene = () => {
    data.scene = new THREE.Scene()
    data.scene.background = new THREE.Color(0xffffff)

    data.mesh = new THREE.Group()

    const iterationData = createTestData()
    data.mesh.add(createCoordinateSystem())
    data.mesh.add(boundingBox())
    data.mesh.add(iterationLines(iterationData))

    data.scene.add(data.mesh)
  }

  const createSizeListener = () => {
    window.addEventListener('resize', function () {
      data.camera.aspect = window.innerWidth / window.innerHeight
      data.camera.updateProjectionMatrix()
      resizeRenderer()
    }, false)
  }

  const resizeRenderer = () => {
    data.renderer.setSize(data.canvasDiv.width(), window.innerHeight * 0.8)
  }

  const render = () => {
    requestAnimationFrame(render)
    data.renderer.render(data.scene, data.camera)
  }

  setup()
  render()
}

angular
  .module('tantalus.simreport')
  .component('simreportIterations', {
    controller: iterationsControllerName,
    templateUrl: 'simreport/iterations.html'
  })
  .controller(iterationsControllerName, ['$scope', '$document', IterationsController])
