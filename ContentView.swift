import SwiftUI
import SpriteKit

enum AppState {
    case menu
    case playing
    case gameOver
}

enum PlayerColorOption: CaseIterable {
    case indigo, crimson, emerald, amber
    
    var playerColor: Color {
        switch self {
        case .indigo: return Color(red: 0.35, green: 0.34, blue: 0.84)
        case .crimson: return Color(red: 0.86, green: 0.08, blue: 0.24)
        case .emerald: return Color(red: 0.18, green: 0.8, blue: 0.44)
        case .amber: return Color(red: 1.0, green: 0.75, blue: 0.0)
        }
    }
    
    var skPlayerColor: SKColor {
        switch self {
        case .indigo: return SKColor(red: 0.35, green: 0.34, blue: 0.84, alpha: 1.0)
        case .crimson: return SKColor(red: 0.86, green: 0.08, blue: 0.24, alpha: 1.0)
        case .emerald: return SKColor(red: 0.18, green: 0.8, blue: 0.44, alpha: 1.0)
        case .amber: return SKColor(red: 1.0, green: 0.75, blue: 0.0, alpha: 1.0)
        }
    }
    
    var skTerritoryColor: SKColor {
        switch self {
        case .indigo: return SKColor(red: 0.5, green: 0.5, blue: 0.9, alpha: 0.9)
        case .crimson: return SKColor(red: 0.9, green: 0.3, blue: 0.4, alpha: 0.9)
        case .emerald: return SKColor(red: 0.3, green: 0.9, blue: 0.5, alpha: 0.9)
        case .amber: return SKColor(red: 1.0, green: 0.85, blue: 0.3, alpha: 0.9)
        }
    }
}

struct ContentView: View {
    @State private var appState: AppState = .menu
    @State private var isWin = false
    @State private var selectedColor: PlayerColorOption = .indigo
    @State private var playerName: String = generateFunnyName()
    
    @State private var isEditingName = false
    @FocusState private var isNameFocused: Bool
    
    @StateObject private var gameScene: GameScene = {
        let scene = GameScene()
        scene.size = CGSize(width: 800, height: 800)
        scene.scaleMode = .aspectFit
        return scene
    }()
    
    var body: some View {
        ZStack {
            Color(white: 0.90).ignoresSafeArea()
            
            if appState == .playing || appState == .gameOver {
                VStack(spacing: 0) {
                    // HUD Frame
                    HStack {
                        Text(playerName)
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(selectedColor.playerColor)
                        
                        Spacer()
                        
                        let percent = (Double(gameScene.capturedCellsCount) / 2500.0) * 100
                        Text(String(format: "%.1f%% Control", percent))
                            .font(.system(size: 20, weight: .semibold, design: .monospaced))
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal, 30)
                    .frame(height: 70)
                    
                    // Game Board Frame
                    SpriteView(scene: gameScene, options: [.ignoresSiblingOrder])
                        .aspectRatio(1.0, contentMode: .fit)
                        .background(Color.white)
                }
                .onAppear {
                    gameScene.onGameOver = { won in
                        DispatchQueue.main.async {
                            isWin = won
                            appState = .gameOver
                        }
                    }
                }
            }
            
            if appState == .menu {
                VStack(spacing: 20) {
                    Text("Paper.io POC")
                        .font(.system(size: 60, weight: .heavy))
                        .foregroundColor(.blue)
                        .padding(.bottom, 20)
                    
                    Text("Choose your color:")
                        .font(.headline)
                        .foregroundColor(.gray)
                    
                    HStack(spacing: 20) {
                        ForEach(PlayerColorOption.allCases, id: \.self) { colorOpt in
                            Circle()
                                .fill(colorOpt.playerColor)
                                .frame(width: 50, height: 50)
                                .overlay(
                                    Circle()
                                        .stroke(Color.white, lineWidth: selectedColor == colorOpt ? 4 : 0)
                                        .shadow(radius: selectedColor == colorOpt ? 5 : 0)
                                )
                                .scaleEffect(selectedColor == colorOpt ? 1.1 : 1.0)
                                .onTapGesture {
                                    withAnimation(.spring()) {
                                        selectedColor = colorOpt
                                    }
                                }
                        }
                    }
                    .padding(.bottom, 20)
                    
                    HStack(alignment: .firstTextBaseline, spacing: 0) {
                        Spacer()
                        
                        Text("Welcome ")
                            .font(.system(size: 36, weight: .heavy))
                            .foregroundColor(.white)
                        
                        if isEditingName {
                            Text(playerName.isEmpty ? " " : playerName)
                                .font(.system(size: 36, weight: .heavy))
                                .opacity(0)
                                .padding(.horizontal, 2)
                                .overlay(
                                    TextField("", text: $playerName, onCommit: {
                                        isEditingName = false
                                    })
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 36, weight: .heavy))
                                    .foregroundColor(.white)
                                    .multilineTextAlignment(.center)
                                    .focused($isNameFocused)
                                    .onChange(of: isNameFocused) { focused in
                                        if !focused {
                                            isEditingName = false
                                        }
                                    }
                                )
                        } else {
                            Text(playerName.isEmpty ? " " : playerName)
                                .font(.system(size: 36, weight: .heavy))
                                .foregroundColor(.white)
                                .onTapGesture {
                                    isEditingName = true
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                                        isNameFocused = true
                                    }
                                }
                        }
                        
                        Text("!")
                            .font(.system(size: 36, weight: .heavy))
                            .foregroundColor(.white)
                            
                        Spacer()
                    }
                    .shadow(color: .black, radius: 0.5, x: 1.5, y: 1.5)
                    .shadow(color: .black, radius: 0.5, x: -1.5, y: -1.5)
                    .shadow(color: .black, radius: 0.5, x: -1.5, y: 1.5)
                    .shadow(color: .black, radius: 0.5, x: 1.5, y: -1.5)
                    .padding(.bottom, 30)
                    
                    Button("Start Game") {
                        gameScene.playerColorOption = selectedColor
                        gameScene.reset()
                        appState = .playing
                    }
                    .buttonStyle(MenuButtonStyle(color: .blue))
                    
                    #if os(macOS)
                    Button("Quit") {
                        NSApplication.shared.terminate(nil)
                    }
                    .buttonStyle(MenuButtonStyle(color: .red))
                    #endif
                }
            } else if appState == .gameOver {
                VStack(spacing: 20) {
                    Text(isWin ? "You Win!" : "Game Over")
                        .font(.system(size: 50, weight: .bold))
                        .foregroundColor(isWin ? .green : .red)
                    
                    if isWin {
                        Text("100% Territory Captured!")
                            .font(.title3)
                            .foregroundColor(.gray)
                            .padding(.bottom, 10)
                    }
                    
                    Button("Restart") {
                        gameScene.playerColorOption = selectedColor
                        gameScene.reset()
                        appState = .playing
                    }
                    .buttonStyle(MenuButtonStyle(color: .blue))
                    
                    Button("Quit to Menu") {
                        appState = .menu
                    }
                    .buttonStyle(MenuButtonStyle(color: .gray))
                    
                    #if os(macOS)
                    Button("Quit Game") {
                        NSApplication.shared.terminate(nil)
                    }
                    .buttonStyle(MenuButtonStyle(color: .red))
                    .padding(.top, 10)
                    #endif
                }
                .padding(40)
                .background(Color.white.opacity(0.95))
                .cornerRadius(20)
                .shadow(radius: 10)
            }
        }
    }
}

struct MenuButtonStyle: ButtonStyle {
    var color: Color
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.title2.bold())
            .foregroundColor(.white)
            .frame(width: 220)
            .padding(.vertical, 15)
            .background(color)
            .cornerRadius(10)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
    }
}

func generateFunnyName() -> String {
    let names = [
        "Sir Snax-a-Lot", "Captain Crunch", "The Blockfather", "Square Pants", 
        "Blocky Balboa", "Pixel Pioneer", "Paper Boy", "Lord of the Grid",
        "Color Conqueror", "Geometric Genius", "The Paintbrush", "Area 51"
    ]
    return names.randomElement() ?? "Player 1"
}
