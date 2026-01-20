# System Patterns: Navigation & Observation Engine

## Core Architecture Pattern
**"Navigation & Observation Engine"** - A dual-mode system that handles both survey list navigation and form filling based on page context detection.

## Key Components

### 1. NavigationEngine (Flow Control)
- **Exit-Reenter Logic**: After survey save, triggers parent window "Anketler" menu to refresh list
- **Auto-Discovery**: Scans refreshed page for "Doldurulmamış" (unfilled) surveys
- **Context Detection**: Determines if current page is survey list or survey form

### 2. Event Simulation Layer
- **DOM + Events**: Sets input values AND triggers proper events (input, change, click)
- **Bubbling Strategy**: Uses event bubbling to ensure ASP.NET recognizes user input
- **Real User Simulation**: Makes server believe input came from actual user interaction

### 3. Modal Management System
- **Automatic Overlay Removal**: Detects and closes blocking UI elements
- **Multi-Context Support**: Handles modals in both iframe and parent window
- **Confirmation Auto-Click**: Automatically clicks "Tamam/OK" buttons

## Data Flow Architecture
```
Survey List → Detect Unfilled → Enter Survey → Fill Form → User Saves → 
Trigger Menu Refresh → Updated List → Next Survey → Repeat
```

## Form Filling Strategy
1. **Radio Button Groups**: Target specific values or use index-based selection
2. **Select Dropdowns**: Match by value, text content, or select highest option
3. **AKTS/Workload Inputs**: Parse row text for suggested values or use defaults
4. **Event Chain**: Value assignment → input event → change event → validation

## Error Handling Patterns
- **Modal Killer Loop**: Continuous background process to remove blocking elements
- **Mutation Observer**: Watches for dynamic content changes (ASP.NET UpdatePanels)
- **Fallback Navigation**: If parent menu access fails, reload current frame
- **Cross-Origin Protection**: Graceful handling of iframe security restrictions

## State Management
- **Processing Markers**: Uses `data-anket-processed` attributes to prevent re-processing
- **User Preferences**: Chrome storage for survey score settings
- **Session Continuity**: Maintains state across page navigations and refreshes