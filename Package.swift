// swift-tools-version: 5.8
import PackageDescription

let package = Package(
    name: "PaperIO",
    platforms: [
        .macOS(.v13),
        .iOS(.v16)
    ],
    products: [
        .executable(name: "PaperIO", targets: ["PaperIO"])
    ],
    targets: [
        .executableTarget(
            name: "PaperIO",
            path: ".",
            sources: ["ContentView.swift", "GameScene.swift", "PaperIOApp.swift"]
        )
    ]
)
