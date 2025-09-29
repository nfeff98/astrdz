import { GLTFLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js'

class AsteroidHandler {
    constructor(scene, camera) {
        this.scene = scene
        this.camera = camera
        this.asteroids = []
        this.asteroidModel = null
        this.gltfLoader = new GLTFLoader()
        this.isLoaded = false
        this.lastAsteroidTime = 0
        this.maxAsteroids = 100 // Maximum number of asteroids allowed
        this.asteroidSpeed = 0.001 // Speed of asteroid movement
        // Load the asteroid model
        this.loadAsteroidModel()
        
        this.running = true
    }
    
    loadAsteroidModel() {
        this.gltfLoader.load(
            './static/beam1.glb',
            (gltf) => {
                this.asteroidModel = gltf.scene
                this.isLoaded = true

                this.asteroidModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material = new THREE.MeshLambertMaterial({ 
                            color: 0x2d2d2d,
                            transparent: false,
                            opacity: 1
                        })
                    }
                })
                console.log('Asteroid model loaded successfully!')
            },
            (progress) => {
                console.log('Loading asteroid progress:', (progress.loaded / progress.total * 100) + '%')
            },
            (error) => {
                console.error('Error loading asteroid model:', error)
            }
        )

    }
    
    createAsteroid(rocketPosition, level) {
        if (!this.isLoaded || this.asteroids.length >= this.maxAsteroids) {
            return null
        }
        
        // Clone the asteroid model
        const asteroid = this.asteroidModel.clone()
        if (!level) {
            level = Math.floor(Math.random() * 3) + 1
        }
        // Set position and scale
        asteroid.position.set(rocketPosition.x, rocketPosition.y, rocketPosition.z)

        const offset = level ? 0 : Math.random() * 4 + 1
        const direction = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, 0)
        asteroid.position.x += offset * direction.x
        asteroid.position.y += offset * direction.y
        asteroid.position.z += offset * direction.z

        asteroid.scale.set(10 * level, 1 * level,10 * level) 
        console.log("created asteroid  at position:", asteroid.position)
        const speed = Math.random() * 0.01 

        // Add to scene
        this.scene.add(asteroid)
        
        
        // Create asteroid data
        const asteroidData = {
            mesh: asteroid,
            velocity: {
                x: direction.x * speed,
                y: direction.y * speed,
                z: 0
            },
            rotationVelocity: {
                x: (Math.random() - 0.5) * 0.02, // Random rotation speed on X axis
                y: (Math.random() - 0.5) * 0.02, // Random rotation speed on Y axis
                z: (Math.random() - 0.5) * 0.02  // Random rotation speed on Z axis
            },
            startTime: Date.now(),
            isActive: true,
            level: level,
            position: new THREE.Vector3(asteroid.position.x, asteroid.position.y, asteroid.position.z)
        }
        
        this.asteroids.push(asteroidData)
        return asteroidData
    }
    
    updateAsteroids(bullets, bulletHandler, rocketPosition) {
        const currentTime = Date.now()

        // create one new asteroid every second
        if (!this.running) {
            this.running = true
            setInterval(() => {
                this.createAsteroid(rocketPosition)
            }, 1000)
        }
        
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i]

            for (let j = 0; j < bullets.length; j++) {
                const bullet = bullets[j];
                const flattenedDistance = Math.sqrt(Math.pow(asteroid.mesh.position.x - bullet.mesh.position.x, 2) + Math.pow(asteroid.mesh.position.y - bullet.mesh.position.y, 2))
                if (flattenedDistance < 0.1) {
                    bulletHandler.removeBullet(j)

                    console.log("hit asteroid")
                    asteroid.level--;
                    if (asteroid.level > 0) {
                        const subAsteroids = Math.floor(Math.random() * 3) + 1;
                        for (let k = 0; k < subAsteroids; k++) {
                            const offset = Math.random() * 0
                            const sum = asteroid.position.add(new THREE.Vector3(offset, offset, offset))
                            this.createAsteroid(sum, asteroid.level)
                        }
                    }
                    this.removeAsteroid(i)

                    continue
                }
            }
            
            if (!asteroid.isActive) {
                continue
            }
            

            // Update position
            asteroid.mesh.position.x += asteroid.velocity.x
            asteroid.mesh.position.y += asteroid.velocity.y
            asteroid.mesh.position.z += asteroid.velocity.z
            
            // Update rotation
            asteroid.mesh.rotation.x += asteroid.rotationVelocity.x
            asteroid.mesh.rotation.y += asteroid.rotationVelocity.y
            asteroid.mesh.rotation.z += asteroid.rotationVelocity.z
            
            // Check if asteroid is too far from camera (cleanup)
            const distanceFromCamera = asteroid.mesh.position.distanceTo(this.camera.position)
            if (distanceFromCamera > 100) {
                this.removeAsteroid(i)
                continue
            }
        }
    }
    
    removeAsteroid(index) {
        const asteroid = this.asteroids[index]
        
        // Remove from scene
        this.scene.remove(asteroid.mesh)
        
        // Dispose of geometry and materials to prevent memory leaks
        asteroid.mesh.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose()
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose())
                    } else {
                        child.material.dispose()
                    }
                }
            }
        })
        
        // Remove from asteroids array
        this.asteroids.splice(index, 1)
    }
    
    clearAllAsteroids() {
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            this.removeAsteroid(i)
        }
    }
    
    getAsteroidCount() {
        return this.asteroids.length
    }
    
   
}

export default AsteroidHandler