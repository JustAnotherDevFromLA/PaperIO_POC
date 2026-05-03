import SpriteKit
import SwiftUI
#if os(macOS)
import AppKit
#endif

extension SKTexture {
    static func createParticle() -> SKTexture {
        let size = CGSize(width: 10, height: 10)
        #if os(macOS)
        let image = NSImage(size: size)
        image.lockFocus()
        NSColor.white.setFill()
        NSBezierPath(ovalIn: NSRect(origin: .zero, size: size)).fill()
        image.unlockFocus()
        return SKTexture(image: image)
        #else
        UIGraphicsBeginImageContextWithOptions(size, false, 0.0)
        let context = UIGraphicsGetCurrentContext()!
        context.setFillColor(UIColor.white.cgColor)
        context.fillEllipse(in: CGRect(origin: .zero, size: size))
        let image = UIGraphicsGetImageFromCurrentImageContext()!
        UIGraphicsEndImageContext()
        return SKTexture(image: image)
        #endif
    }
}

enum CellType {
    case empty
    case territory
    case tail
}

enum Direction {
    case up, down, left, right
    
    var offset: (dx: Int, dy: Int) {
        switch self {
        case .up:    return (0, 1)
        case .down:  return (0, -1)
        case .left:  return (-1, 0)
        case .right: return (1, 0)
        }
    }
}

class GameScene: SKScene, ObservableObject {
    
    let gridSize: Int = 50
    let cellSize: CGFloat = 16.0
    
    var grid: [[CellType]] = []
    var cellNodes: [[SKSpriteNode?]] = []
    var playerColorOption: PlayerColorOption = .indigo
    
    var playerPos = (x: 25, y: 25)
    var oldPlayerPos = (x: 25, y: 25)
    var currentDirection: Direction = .up
    var nextDirection: Direction = .up
    var isDead = false
    var onGameOver: ((Bool) -> Void)?
    
    var tail: [(x: Int, y: Int)] = []
    @Published var capturedCellsCount = 0
    var _capturedCountInternal = 0
    
    var lastUpdateTime: TimeInterval = 0
    var moveTimer: TimeInterval = 0
    let moveInterval: TimeInterval = 0.06
    
    let gridNode = SKNode()
    let playerNode = SKSpriteNode(color: SKColor.white, size: CGSize(width: 16, height: 16))
    
    override func didMove(to view: SKView) {
        let gridWidth = CGFloat(gridSize) * cellSize
        gridNode.position = CGPoint(x: size.width / 2 - gridWidth / 2 + cellSize / 2,
                                    y: size.height / 2 - gridWidth / 2 + cellSize / 2)
        addChild(gridNode)
        
        #if os(iOS)
        let swipeRight = UISwipeGestureRecognizer(target: self, action: #selector(swipedRight))
        swipeRight.direction = .right
        view.addGestureRecognizer(swipeRight)

        let swipeLeft = UISwipeGestureRecognizer(target: self, action: #selector(swipedLeft))
        swipeLeft.direction = .left
        view.addGestureRecognizer(swipeLeft)

        let swipeUp = UISwipeGestureRecognizer(target: self, action: #selector(swipedUp))
        swipeUp.direction = .up
        view.addGestureRecognizer(swipeUp)

        let swipeDown = UISwipeGestureRecognizer(target: self, action: #selector(swipedDown))
        swipeDown.direction = .down
        view.addGestureRecognizer(swipeDown)
        #endif
        
        #if os(macOS)
        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            self?.keyDown(with: event)
            return event
        }
        #endif
        
        reset()
    }
    
    func reset() {
        self.removeAllActions()
        playerNode.removeAllActions()
        playerNode.removeAllChildren()
        
        for row in cellNodes {
            for node in row {
                node?.removeFromParent()
            }
        }
        
        backgroundColor = SKColor.white
        grid = Array(repeating: Array(repeating: .empty, count: gridSize), count: gridSize)
        cellNodes = Array(repeating: Array(repeating: nil, count: gridSize), count: gridSize)
        
        playerPos = (x: 25, y: 25)
        oldPlayerPos = (x: 25, y: 25)
        currentDirection = .up
        nextDirection = .up
        isDead = false
        tail.removeAll()
        _capturedCountInternal = 0
        capturedCellsCount = 0
        lastUpdateTime = 0
        moveTimer = 0
        
        playerNode.color = playerColorOption.skPlayerColor
        playerNode.zPosition = 10
        playerNode.position = CGPoint(x: CGFloat(playerPos.x) * cellSize, y: CGFloat(playerPos.y) * cellSize)
        
        let shadowNode = SKSpriteNode(color: SKColor(white: 0.0, alpha: 0.3), size: CGSize(width: 16, height: 16))
        shadowNode.position = CGPoint(x: 2, y: -2)
        shadowNode.zPosition = -1
        playerNode.addChild(shadowNode)
        
        if playerNode.parent == nil {
            gridNode.addChild(playerNode)
        }
        
        for x in playerPos.x - 1 ... playerPos.x + 1 {
            for y in playerPos.y - 1 ... playerPos.y + 1 {
                setGrid(x: x, y: y, type: .territory)
            }
        }
    }
    
    func setGrid(x: Int, y: Int, type: CellType) {
        let oldType = grid[x][y]
        grid[x][y] = type
        
        if type == .territory && oldType != .territory {
            _capturedCountInternal += 1
        } else if oldType == .territory && type != .territory {
            _capturedCountInternal -= 1
        }
        
        if type == .empty {
            if let node = cellNodes[x][y] {
                node.removeFromParent()
                cellNodes[x][y] = nil
            }
        } else {
            let isTerritory = type == .territory
            let color = isTerritory ? playerColorOption.skTerritoryColor : SKColor(white: 0.5, alpha: 0.4)
            let size = isTerritory ? CGSize(width: cellSize + 0.5, height: cellSize + 0.5) : CGSize(width: cellSize - 1, height: cellSize - 1)
            let zPos: CGFloat = isTerritory ? 0 : 1
            
            if let node = cellNodes[x][y] {
                node.color = color
                node.size = size
                node.zPosition = zPos
            } else {
                let node = SKSpriteNode(color: color, size: size)
                node.position = CGPoint(x: CGFloat(x) * cellSize, y: CGFloat(y) * cellSize)
                node.zPosition = zPos
                gridNode.addChild(node)
                cellNodes[x][y] = node
            }
        }
    }
    
    #if os(iOS)
    @objc func swipedRight() { if currentDirection != .left { nextDirection = .right } }
    @objc func swipedLeft()  { if currentDirection != .right { nextDirection = .left } }
    @objc func swipedUp()    { if currentDirection != .down { nextDirection = .up } }
    @objc func swipedDown()  { if currentDirection != .up { nextDirection = .down } }
    #endif
    
    #if os(macOS)
    override func keyDown(with event: NSEvent) {
        switch event.keyCode {
        case 123: // Left
            if currentDirection != .right { nextDirection = .left }
        case 124: // Right
            if currentDirection != .left { nextDirection = .right }
        case 125: // Down
            if currentDirection != .up { nextDirection = .down }
        case 126: // Up
            if currentDirection != .down { nextDirection = .up }
        default:
            break
        }
    }
    #endif
    
    override func update(_ currentTime: TimeInterval) {
        if isDead { return }
        if lastUpdateTime == 0 { lastUpdateTime = currentTime }
        let dt = currentTime - lastUpdateTime
        lastUpdateTime = currentTime
        
        moveTimer += dt
        
        while moveTimer >= moveInterval {
            moveTimer -= moveInterval
            movePlayer()
        }
        
        // Linear Interpolation (Lerp) for perfectly smooth, zero-lag movement
        if !isDead {
            let progress = CGFloat(moveTimer / moveInterval)
            let startX = CGFloat(oldPlayerPos.x) * cellSize
            let startY = CGFloat(oldPlayerPos.y) * cellSize
            let endX = CGFloat(playerPos.x) * cellSize
            let endY = CGFloat(playerPos.y) * cellSize
            
            let currentX = startX + (endX - startX) * progress
            let currentY = startY + (endY - startY) * progress
            playerNode.position = CGPoint(x: currentX, y: currentY)
        }
        
        if capturedCellsCount != _capturedCountInternal {
            capturedCellsCount = _capturedCountInternal
        }
    }
    
    func movePlayer() {
        currentDirection = nextDirection
        let offset = currentDirection.offset
        let newX = playerPos.x + offset.dx
        let newY = playerPos.y + offset.dy
        
        // Check Bounds
        if newX < 0 || newX >= gridSize || newY < 0 || newY >= gridSize {
            gameOver()
            return
        }
        
        let cellTarget = grid[newX][newY]
        
        // Hit Own Tail
        if cellTarget == .tail {
            gameOver()
            return
        }
        
        oldPlayerPos = playerPos
        playerPos = (x: newX, y: newY)
        
        // Leave trail BEHIND the player if the cell they just left was empty
        if grid[oldPlayerPos.x][oldPlayerPos.y] == .empty {
            setGrid(x: oldPlayerPos.x, y: oldPlayerPos.y, type: .tail)
            tail.append((x: oldPlayerPos.x, y: oldPlayerPos.y))
        }
        
        if cellTarget == .territory {
            if !tail.isEmpty {
                captureTerritory()
            }
        }
        
        if _capturedCountInternal >= gridSize * gridSize {
            winGame()
            return
        }
    }
    
    func captureTerritory() {
        for t in tail {
            setGrid(x: t.x, y: t.y, type: .territory)
        }
        tail.removeAll()
        fillEnclosedAreas()
    }
    
    func fillEnclosedAreas() {
        var outside: [[Bool]] = Array(repeating: Array(repeating: false, count: gridSize), count: gridSize)
        var queue: [(Int, Int)] = []
        
        for x in 0..<gridSize {
            for y in 0..<gridSize {
                if x == 0 || x == gridSize - 1 || y == 0 || y == gridSize - 1 {
                    if grid[x][y] != .territory {
                        queue.append((x, y))
                        outside[x][y] = true
                    }
                }
            }
        }
        
        var idx = 0
        while idx < queue.count {
            let (cx, cy) = queue[idx]
            idx += 1
            
            let neighbors = [(0,1), (0,-1), (1,0), (-1,0)]
            for n in neighbors {
                let nx = cx + n.0
                let ny = cy + n.1
                if nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize {
                    if !outside[nx][ny] && grid[nx][ny] != .territory {
                        outside[nx][ny] = true
                        queue.append((nx, ny))
                    }
                }
            }
        }
        
        for x in 0..<gridSize {
            for y in 0..<gridSize {
                if !outside[x][y] && grid[x][y] != .territory {
                    setGrid(x: x, y: y, type: .territory)
                }
            }
        }
    }
    
    func winGame() {
        if isDead { return }
        isDead = true
        playerNode.removeAllActions()
        
        // Winning visual effects: pulse the background
        let winColor = playerColorOption.skPlayerColor
        let colorPulse = SKAction.sequence([
            SKAction.colorize(with: SKColor.white, colorBlendFactor: 1.0, duration: 0.2),
            SKAction.colorize(with: winColor, colorBlendFactor: 1.0, duration: 0.2)
        ])
        backgroundColor = winColor
        run(SKAction.repeatForever(colorPulse))
        
        // Start continuous fireworks!
        let wait = SKAction.wait(forDuration: 0.5)
        let spawn = SKAction.run { [weak self] in self?.spawnSingleFirework() }
        let seq = SKAction.sequence([spawn, wait])
        run(SKAction.repeatForever(seq), withKey: "fireworksLoop")
        
        // Instant menu usability
        self.onGameOver?(true)
    }
    
    func spawnSingleFirework() {
        let texture = SKTexture.createParticle()
        let colors: [SKColor] = [.systemRed, .systemGreen, .systemBlue, .systemYellow, .systemOrange, .systemPurple, .cyan, .magenta]
        
        let emitter = SKEmitterNode()
        emitter.particleTexture = texture
        emitter.particleBirthRate = 800
        emitter.numParticlesToEmit = 150
        emitter.particleLifetime = 1.5
        emitter.particlePositionRange = CGVector(dx: 10, dy: 10)
        emitter.particleSpeed = 250
        emitter.particleSpeedRange = 100
        emitter.particleAlpha = 1.0
        emitter.particleAlphaSpeed = -0.7
        emitter.particleScale = 0.6
        emitter.particleScaleRange = 0.3
        emitter.particleScaleSpeed = -0.2
        emitter.emissionAngleRange = CGFloat.pi * 2
        emitter.particleColorBlendFactor = 1.0
        emitter.particleColor = colors.randomElement()!
        
        let randomX = CGFloat.random(in: 100...size.width - 100)
        let randomY = CGFloat.random(in: 100...size.height - 100)
        emitter.position = CGPoint(x: randomX, y: randomY)
        emitter.zPosition = 100
        
        addChild(emitter)
        
        let wait = SKAction.wait(forDuration: 2.0)
        let remove = SKAction.removeFromParent()
        emitter.run(SKAction.sequence([wait, remove]))
    }
    
    func gameOver() {
        if isDead { return }
        isDead = true
        backgroundColor = SKColor.red
        playerNode.removeAllActions()
        self.onGameOver?(false)
    }
}
