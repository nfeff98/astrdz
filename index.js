import {OrbitControls} from 'https://unpkg.com/three@0.127.0/examples/jsm/controls/OrbitControls.js'
import {GLTFLoader} from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';


import { EffectComposer } from 'https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/RenderPass.js'
import { GlitchPass } from 'https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/GlitchPass.js'
import { UnrealBloomPass } from 'https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Pass } from "https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/Pass.js"

import RenderPixelatedPass from "./RenderPixelatedPass.js"
import PixelatePass from "./PixelatePass.js"
import BulletHandler from "./bulletHandler.js"
import AsteroidHandler from "./asteroidHandler.js"


// Pixel texture helper function
function pixelTex(tex) {
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
}

const canvas = document.querySelector('canvas.webgl')
const starsCanvas = document.querySelector('canvas.stars-canvas')

// Stars system
const starsCtx = starsCanvas.getContext('2d')
const stars = []
const starCount = 200
const starFieldSize = 2000 // How far stars extend in each direction

// Generate stars procedurally
function generateStars() {
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: (Math.random() - 0.5) * starFieldSize,
            y: (Math.random() - 0.5) * starFieldSize,
            size: Math.random() * 2 + 0.5,
            brightness: Math.random() * 0.8 + 0.2,
            twinkle: Math.random() * Math.PI * 2 // For twinkling effect
        })
    }
}

// Initialize stars
generateStars()

// Set up stars canvas size
function resizeStarsCanvas() {
    starsCanvas.width = window.innerWidth
    starsCanvas.height = window.innerHeight
}

resizeStarsCanvas()
window.addEventListener('resize', resizeStarsCanvas)

// Render stars function
function renderStars() {
    // Clear the canvas
    starsCtx.fillStyle = '#000011'
    starsCtx.fillRect(0, 0, starsCanvas.width, starsCanvas.height)
    
    // Get rocket position for parallax effect
    // Stars should move OPPOSITE to rocket movement for parallax
    const offsetX = rocketPhysics.position.x * 250 // Increased parallax factor
    const offsetY = -rocketPhysics.position.y * 250
    

    // Render each star
    stars.forEach((star, index) => {
        // Calculate screen position with parallax
        let screenX = (star.x - offsetX) % starFieldSize
        let screenY = (star.y - offsetY) % starFieldSize
        
        // Wrap around if star goes off screen with procedural variation
        if (screenX < -starFieldSize/2) {
            screenX += starFieldSize
            // Add procedural variation when wrapping
            star.x += (Math.random() - 0.5) * starFieldSize * 0.0004
        } else if (screenX > starFieldSize/2) {
            screenX -= starFieldSize
            star.x -= (Math.random() - 0.5) * starFieldSize * 0.0004
        }
        
        if (screenY < -starFieldSize/2) {
            screenY += starFieldSize
            // Add procedural variation when wrapping
            star.y += (Math.random() - 0.5) * starFieldSize * 0.0004
        } else if (screenY > starFieldSize/2) {
            screenY -= starFieldSize
            star.y -= (Math.random() - 0.5) * starFieldSize * 0.0004
        }
        
        const finalX = screenX
        const finalY = screenY
        
        // Convert to screen coordinates
        const canvasX = (finalX / starFieldSize) * starsCanvas.width + starsCanvas.width / 2
        const canvasY = (finalY / starFieldSize) * starsCanvas.height + starsCanvas.height / 2
        
        // Skip if star is off screen
        if (canvasX < 0 || canvasX > starsCanvas.width || canvasY < 0 || canvasY > starsCanvas.height) {
            return
        }
        
        // Static stars with no twinkling
        const alpha = star.brightness
        
        // Simple white stars
        starsCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        starsCtx.beginPath()
        starsCtx.arc(canvasX, canvasY, star.size, 0, Math.PI * 2)
        starsCtx.fill()
    })
}

// Scene
const scene = new THREE.Scene()
// No background set - this makes it transparent

// Initialize bullet handler
let bulletHandler = null

let asteroidHandler = null

// Pixelated rendering setup
let screenResolution = new THREE.Vector2(window.innerWidth, window.innerHeight)
let renderResolution = screenResolution.clone().divideScalar(6) // 1/6th resolution for pixelated effect
renderResolution.x |= 0
renderResolution.y |= 0

// Effect Composer for post-processing
let composer

// Add lighting
const pointLight = new THREE.PointLight(0xffffff, 1, 50)
pointLight.position.set(10, 0, 5)
scene.add(pointLight)

const crossLight = new THREE.PointLight(0x332222, 1, 15)
crossLight.position.set(5, 0, 2)
scene.add(crossLight)

// Add ambient light for better visibility
scene.add(new THREE.AmbientLight(0x2d3645, 1.5))

// Add a visible light helper to see where the light is
const lightHelper = new THREE.PointLightHelper(pointLight, 1)
scene.add(lightHelper)

// Add some debugging for the light
//console.log('Point light position:', pointLight.position)
//console.log('Point light intensity:', pointLight.intensity)
//console.log('Point light distance:', pointLight.distance)



const textureLoader = new THREE.TextureLoader()
const myTexture = pixelTex(textureLoader.load('coolTex.jpg'))

// Get boost button (the one that's not an arrow button)
const buttonBoost = document.querySelector('.corner-text.bottom-right button')

// Mobile arrow controls
const arrowUp = document.getElementById('arrow-up')
const arrowDown = document.getElementById('arrow-down')
const arrowLeft = document.getElementById('arrow-left')
const arrowRight = document.getElementById('arrow-right')



// Keyboard controls for movement
const keys = {
    w: false, // Forward
    s: false, // Backward
    a: false, // Left
    d: false, // Right
    space: false, // Boost
    mouseRight: false, // Right mouse button
    mouseLeft: false, // Left mouse button
}

document.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
        keys.mouseRight = true;
    } else if (event.button === 0) {
        keys.mouseLeft = true;
        // Shoot bullet on left mouse click
        if (bulletHandler) {
            console.log("Shooting bullet")
            bulletHandler.shootFromRocket(
                new THREE.Vector3(rocketPhysics.position.x, rocketPhysics.position.y, rocketPhysics.position.z),
                -rocketPhysics.rotation.z,
                new THREE.Vector3(rocketPhysics.velocity.x, rocketPhysics.velocity.y, rocketPhysics.velocity.z)
            )
        }
    }
})

// Track which keys are pressed
document.addEventListener('keydown', (event) => {
    switch(event.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyD': keys.d = true; break;
        case 'Space': 
            keys.space = true; 
            event.preventDefault(); // Prevent page scroll
            break;
    }
})

document.addEventListener('keyup', (event) => {
    switch(event.code) {
        case 'KeyW': keys.w = false; break;
        case 'KeyS': keys.s = false; break;
        case 'KeyA': keys.a = false; break;
        case 'KeyD': keys.d = false; break;
        case 'Space': keys.space = false; break;
    }
})

// Mobile arrow button event handlers
arrowUp.addEventListener('touchstart', (e) => {
    e.preventDefault()
    keys.w = true
})
arrowUp.addEventListener('touchend', (e) => {
    e.preventDefault()
    keys.w = false
})
arrowUp.addEventListener('mousedown', () => {
    keys.w = true
})
arrowUp.addEventListener('mouseup', () => {
    keys.w = false
})

arrowDown.addEventListener('touchstart', (e) => {
    e.preventDefault()
    keys.s = true
})
arrowDown.addEventListener('touchend', (e) => {
    e.preventDefault()
    keys.s = false
})
arrowDown.addEventListener('mousedown', () => {
    keys.s = true
})
arrowDown.addEventListener('mouseup', () => {
    keys.s = false
})

arrowLeft.addEventListener('touchstart', (e) => {
    e.preventDefault()
    keys.a = true
    //console.log('Arrow left touch start')
})
arrowLeft.addEventListener('touchend', (e) => {
    e.preventDefault()
    keys.a = false
    //console.log('Arrow left touch end')
})
arrowLeft.addEventListener('mousedown', (e) => {
    e.preventDefault()
    keys.a = true
    //console.log('Arrow left mouse down')
})
arrowLeft.addEventListener('mouseup', (e) => {
    e.preventDefault()
    keys.a = false
    //console.log('Arrow left mouse up')
})

arrowRight.addEventListener('touchstart', (e) => {
    e.preventDefault()
    keys.d = true
})
arrowRight.addEventListener('touchend', (e) => {
    e.preventDefault()
    keys.d = false
})
arrowRight.addEventListener('mousedown', () => {
    keys.d = true
})
arrowRight.addEventListener('mouseup', () => {
    keys.d = false
})

buttonBoost.addEventListener('mousedown', () => {
    keys.space = true
})  
buttonBoost.addEventListener('mouseup', () => {
    keys.space = false
})
buttonBoost.addEventListener('touchstart', () => {
    keys.space = true
})
buttonBoost.addEventListener('touchend', () => {
    keys.space = false
})

const coords = document.getElementById('coords')

// Create rocket mesh (will be replaced by GLB model)
let rocket = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshBasicMaterial({map: myTexture})
)
scene.add(rocket)

let booster = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshBasicMaterial({map: myTexture})
)
scene.add(booster)

// Load GLB rocket model
const gltfLoader = new GLTFLoader()
gltfLoader.load(
    './static/untitled.glb',
    (gltf) => {
        // Remove the placeholder box
        scene.remove(rocket)
        
        // Get the rocket model from the GLB
        rocket = gltf.scene
        
        // Handle multiple materials in the GLTF model
        //console.log('=== GLTF Model Analysis ===')
        //console.log('Total children in rocket:', rocket.children.length)
        
        rocket.traverse((child) => {
            if (child.isMesh) {
                //console.log('=== MESH FOUND ===')
                //console.log('Mesh name:', child.name)
                //console.log('Mesh type:', child.type)
                //console.log('Has material:', !!child.material)
                //console.log('Material type:', typeof child.material)
                //console.log('Is array:', Array.isArray(child.material))
                
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        //console.log('Array length:', child.material.length)
                        child.material.forEach((mat, index) => {
                            //console.log(`Material ${index}:`, mat.type, mat.name)
                            child.material = new THREE.MeshLambertMaterial({ 
                                color: 0xffffff,
                                transparent: false,
                                opacity: 1
                            })
                        })
                    } else {
                        //console.log('Single material:', child.material.type, child.material.name)
                        if (child.material.name.includes("white")) {    
                        child.material = new THREE.MeshLambertMaterial({ 
                            color: 0xf2f2f2,
                            transparent: false,
                            opacity: 1,
                        })
                        } else {
                            child.material = new THREE.MeshLambertMaterial({ 
                                color: 0x00a3ff,
                                transparent: false,
                                opacity: 1
                            })
                        }
                    }
                }
                
                // Check if mesh has geometry with multiple materials
                if (child.geometry && child.geometry.groups) {
                    //console.log('Geometry groups:', child.geometry.groups.length)
                    child.geometry.groups.forEach((group, index) => {
                        //console.log(`Group ${index}:`, group)
                    })
                }
                
           
            }
        })
        
        // Scale the model if needed (adjust these values based on your model)
        rocket.scale.set(.15, .15, .15)
        
        // Position the rocket
        rocket.position.set(0, 0, 0)
        rocket.rotation.set(0, 0, 90)
        
        // Add the rocket to the scene
        scene.add(rocket)
        
        //console.log('Rocket GLB model loaded successfully!')
        
        // Force material update after a short delay to ensure everything is loaded
        setTimeout(() => {
            rocket.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Force material update
                    child.material.needsUpdate = true
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.needsUpdate = true)
                    }
                }
            })
        }, 100)
    },
    (progress) => {
        //console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%')
    },
    (error) => {
        console.error('Error loading rocket model:', error)
    }
)
gltfLoader.load(
    './static/booster.glb',
    (gltf) => {
        scene.remove(booster)
        booster = gltf.scene
        booster.scale.set(.1, .1, .1)
        booster.position.set(0, 0, 0)
        booster.rotation.set(0, 0, 0)
        
        scene.add(booster)
        rocket.add(booster)
        booster.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material = new THREE.MeshLambertMaterial({ 
                    color: 0xffa500,
                    transparent: false,
                    opacity: 1
                })
            }
        })

        setTimeout(() => {
            booster.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.needsUpdate = true
                }
            })
        }, 100)
    }
)

// Physics variables for the rocket
const rocketPhysics = {
    // Position (where the rocket is)
    position: { x: 0, y: 0, z: 0 },
    
    // Velocity (how fast it's moving in each direction)
    velocity: { x: 0, y: 0, z: 0 },
    
    // Acceleration (how velocity changes)
    acceleration: { x: 0, y: 0, z: 0 },

    rotation: { x: 0, y: 0, z: 0 },

    rotationVelocity: { x: 0, y: 0, z: 0 },

    rotationAcceleration: { x: 0, y: 0, z: 0 },
    
    // Physics properties
    mass: 10, // High mass = high inertia (harder to move)
    maxSpeed: .1, // Maximum speed limit
    maxRotationSpeed: 0.1, // Maximum rotation speed
    thrust: 0.001, // How strong the boost is
    rotationThrust: 0.01, // How strong the rotation boost is
    friction: 0.99, // Air resistance (0.98 = 2% speed loss per frame)
    rotationFriction: 0.95
}

// Scene is now empty - ready for your minigame objects
// Sizes
const sizes = {
    width:window.innerWidth,
    height:window.innerHeight
}

// Renderer gets updated each time window is resized
window.addEventListener('resize',()=>{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width/sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width,sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
    
    // Update pixelated rendering resolution
    screenResolution.set(window.innerWidth, window.innerHeight)
    renderResolution.copy(screenResolution).divideScalar(6)
    renderResolution.x |= 0
    renderResolution.y |= 0
    
    // Update composer size
    if (composer) {
        composer.setSize(sizes.width, sizes.height)
    }
})

// Camera
const camera = new THREE.PerspectiveCamera(75,sizes.width/sizes.height,0.1,100)
camera.position.z = 3
scene.add(camera)

// Initialize bullet handler after camera is created
bulletHandler = new BulletHandler(scene, camera)
asteroidHandler = new AsteroidHandler(scene, camera)

// Controls
const controls = new OrbitControls(camera, canvas)

controls.enablePan = false;
controls.enableRotate = false;
controls.enableZoom = false;
controls.enableDamping = false // Disable damping to avoid physics interference
controls.enabled = false // Completely disable controls to avoid interference

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true, // Enable transparency
    antialias: false // Disable antialiasing for pixelated look
})
   
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true

// Initialize Effect Composer with pixelated rendering
composer = new EffectComposer(renderer)
composer.addPass(new RenderPixelatedPass(renderResolution, scene, camera))
let bloomPass = new UnrealBloomPass(screenResolution, 0.4, 0.1, 0.9)
//composer.addPass(bloomPass)
let pixelatePass = new PixelatePass(renderResolution)
pixelatePass.renderToScreen = true // Make sure final pass renders to screen
composer.addPass(pixelatePass)

const clock = new THREE.Clock()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    
    const rocketForwardVector = rocket.rotation.z
    // PHYSICS CALCULATIONS
    // Handle keyboard input
    // Calculate forward direction based on rocket rotation
    const forwardX = Math.sin(rocketForwardVector)
    const forwardY = Math.cos(rocketForwardVector)

    booster.scale.set(0,0,0)
    booster.rotation.set(0, elapsedTime * 2,0)
    keys.space ? booster.position.set(0, 0.1, 0) : booster.position.set(0, -0.3, 0)


    if (keys.w) {
        // Forward thrust in the direction the rocket is facing
        rocketPhysics.acceleration.x -= forwardX * rocketPhysics.thrust * (keys.space ? 2 : 1)
        rocketPhysics.acceleration.y += forwardY * rocketPhysics.thrust * (keys.space ? 2 : 1)
        const boosterLength =  (rocketPhysics.thrust * 2) +.5 * (keys.space ? 2 : 1)
        booster.scale.set(1, boosterLength + Math.sin(elapsedTime * 18) * .02, 1)
    }

    if (keys.a) rocketPhysics.rotationAcceleration.z += rocketPhysics.rotationThrust * .2 // Left rotation
    if (keys.d) rocketPhysics.rotationAcceleration.z -= rocketPhysics.rotationThrust * .2 // Right rotation

  
    if (keys.mouseLeft){
        // Bullet shooting is handled in mousedown event
    }
    
    // Step 1: Apply acceleration to velocity
    rocketPhysics.velocity.x += rocketPhysics.acceleration.x
    rocketPhysics.velocity.y += rocketPhysics.acceleration.y
    rocketPhysics.velocity.z += rocketPhysics.acceleration.z

    rocketPhysics.rotationVelocity.z += rocketPhysics.rotationAcceleration.z
    rocketPhysics.rotationVelocity.x += rocketPhysics.rotationAcceleration.x
    rocketPhysics.rotationVelocity.y += rocketPhysics.rotationAcceleration.y
    
    // Step 2: Apply friction (gradually slow down)
    rocketPhysics.velocity.x *= rocketPhysics.friction
    rocketPhysics.velocity.y *= rocketPhysics.friction
    rocketPhysics.velocity.z *= rocketPhysics.friction
    rocketPhysics.rotationVelocity.z *= rocketPhysics.rotationFriction
    rocketPhysics.rotationVelocity.x *= rocketPhysics.rotationFriction
    rocketPhysics.rotationVelocity.y *= rocketPhysics.rotationFriction
    
    // Step 3: Limit maximum speed
    const speed = Math.sqrt(
        rocketPhysics.velocity.x ** 2 + 
        rocketPhysics.velocity.y ** 2 + 
        rocketPhysics.velocity.z ** 2
    )
    const rotationSpeed = Math.sqrt(
        rocketPhysics.rotationVelocity.x ** 2 + 
        rocketPhysics.rotationVelocity.y ** 2 + 
        rocketPhysics.rotationVelocity.z ** 2
    )
    if (speed > rocketPhysics.maxSpeed) {
        rocketPhysics.velocity.x = (rocketPhysics.velocity.x / speed) * rocketPhysics.maxSpeed
        rocketPhysics.velocity.y = (rocketPhysics.velocity.y / speed) * rocketPhysics.maxSpeed
        rocketPhysics.velocity.z = (rocketPhysics.velocity.z / speed) * rocketPhysics.maxSpeed
    }
    if (rotationSpeed > rocketPhysics.maxRotationSpeed) {
        rocketPhysics.rotationVelocity.x = (rocketPhysics.rotationVelocity.x / rotationSpeed) * rocketPhysics.maxRotationSpeed
        rocketPhysics.rotationVelocity.y = (rocketPhysics.rotationVelocity.y / rotationSpeed) * rocketPhysics.maxRotationSpeed
        rocketPhysics.rotationVelocity.z = (rocketPhysics.rotationVelocity.z / rotationSpeed) * rocketPhysics.maxRotationSpeed
    }
    
    // Step 4: Apply velocity to position (keep Z at 0 for 2D plane)
    rocketPhysics.position.x += rocketPhysics.velocity.x
    rocketPhysics.position.y += rocketPhysics.velocity.y
    rocketPhysics.position.z = 0 // Keep rocket at Z=0 for 2D space
    rocketPhysics.rotation.z += rocketPhysics.rotationVelocity.z
    rocketPhysics.rotation.x += rocketPhysics.rotationVelocity.x
    rocketPhysics.rotation.y += rocketPhysics.rotationVelocity.y

    // Step 5: Update the rocket's position in Three.js (keep Z at 0 for 2D plane)
    rocket.position.set(
        rocketPhysics.position.x,
        rocketPhysics.position.y,
        0 // Keep rocket at Z=0 for 2D space
    )

    rocket.rotation.set(
        rocketPhysics.rotation.x,
        rocketPhysics.rotation.y,
        rocketPhysics.rotation.z
    )

    // Step 6: Reset acceleration (forces are applied once per frame)
    rocketPhysics.acceleration.x = 0
    rocketPhysics.acceleration.y = 0
    rocketPhysics.acceleration.z = 0
    rocketPhysics.rotationAcceleration.x = 0
    rocketPhysics.rotationAcceleration.y = 0
    rocketPhysics.rotationAcceleration.z = 0

    // Update bullets
    if (bulletHandler) {
        bulletHandler.updateBullets()
    }

    // Update asteroids
    if (asteroidHandler) {
        const bullets = bulletHandler.getBullets()
        asteroidHandler.updateAsteroids(bullets, bulletHandler, rocketPhysics.position)
    }

    // Camera dead zone system (like Asteroids)
    const deadZoneRadius = 0 // Radius where ship can move without moving camera
    const cameraLerpSpeed = 0.1// How fast camera catches up
    
    // Calculate distance from camera to rocket (XY only)
    const cameraToRocketX = rocketPhysics.position.x - camera.position.x
    const cameraToRocketY = rocketPhysics.position.y - camera.position.y
    const distanceFromCamera = Math.sqrt(cameraToRocketX ** 2 + cameraToRocketY ** 2)
    
    // Debug camera Z position
    if (keys.a) {
        //console.log('Camera Z before:', camera.position.z, 'Rocket Z:', rocketPhysics.position.z)
    }
    
    // Only move camera if rocket is outside dead zone
    if (distanceFromCamera > deadZoneRadius) {
        // Calculate direction from camera to rocket
        const directionX = cameraToRocketX / distanceFromCamera
        const directionY = cameraToRocketY / distanceFromCamera
        
        // Move camera towards rocket, but only to the edge of the dead zone
        const targetX = rocketPhysics.position.x - directionX * deadZoneRadius
        const targetY = rocketPhysics.position.y - directionY * deadZoneRadius
        
        // Smoothly lerp camera to target position (XY only)
        camera.position.x += (targetX - camera.position.x) * cameraLerpSpeed
        camera.position.y += (targetY - camera.position.y) * cameraLerpSpeed
    }
    
    // Keep camera at fixed Z distance (always looking down at XY plane)
    camera.position.z = 3
    
    // Update point light to follow camera for consistent lighting
    crossLight.position.set(camera.position.x, camera.position.y, camera.position.z + 2)
    pointLight.position.set(camera.position.x, camera.position.y, camera.position.z + 2)
    
    // Debug: Log light position and distance to rocket
    if (Math.floor(Date.now() / 1000) % 3 === 0) {
        const distanceToRocket = pointLight.position.distanceTo(rocket.position)
        //console.log('Light distance to rocket:', distanceToRocket)
        //console.log('Light falloff distance:', pointLight.distance)
        //console.log('Light intensity:', pointLight.intensity)
    }
    
    // Update the controls target to follow the rocket
    //controls.target.set(rocketPhysics.position.x, rocketPhysics.position.y, 0)
    
    coords.textContent = `X: ${rocketPhysics.position.x.toFixed(2)}, Y: ${rocketPhysics.position.y.toFixed(2)} `

    // Render stars first (before composer)
    renderStars()
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
    // controls.update() // Disabled to avoid physics interference
    
    // Use composer for pixelated rendering
    composer.render()

    window.requestAnimationFrame(tick)
};

tick()