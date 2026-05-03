import SwiftUI
#if canImport(AppKit)
import AppKit
#endif

@main
struct PaperIOApp: App {
    init() {
        #if os(macOS)
        NSApplication.shared.setActivationPolicy(.regular)
        NSApplication.shared.activate(ignoringOtherApps: true)
        #endif
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                #if os(macOS)
                .frame(minWidth: 600, minHeight: 650)
                #endif
        }
    }
}
