# Technical Context

## Technology Stack
- **Manifest V3**: Modern Chrome extension architecture
- **Vanilla JavaScript**: No external dependencies for maximum compatibility
- **Chrome Storage API**: User preference persistence
- **Content Scripts**: Injected into OBS pages for DOM manipulation

## Target Environment
- **OBS System**: `obs.firat.edu.tr/oibs/std/*`
- **ASP.NET Backend**: Server-side state management with postback model
- **Complex Iframe Structure**: Nested frames for different sections
- **Dynamic Content**: UpdatePanels and AJAX-based page updates

## Key Dependencies
- Chrome Extensions API (storage, tabs)
- DOM APIs (querySelector, addEventListener, MutationObserver)
- Event simulation (Event, dispatchEvent)
- Cross-frame communication (window.top access)

## Development Setup
- Extension loaded as "unpacked" in Chrome developer mode
- Files directly in project root (manifest.json at top level)
- No build process required - direct file serving
- Testing via Chrome extension developer tools

## Configuration
```javascript
CONFIG = {
    defaultHighScoreValue: "5",
    autoFillDelay: 1500,
    unfilledAttr: 'data-anket-processed',
    refreshInterval: 2000,
    modalCheckInterval: 500
}
```

## File Structure
```
/
├── manifest.json (Extension configuration)
├── popup.html/js (User interface)
├── content_script.js (Main automation logic)
├── background.js (Currently empty)
└── icons/ (Extension icons)
```

## Browser Compatibility
- Primary: Chrome/Chromium-based browsers
- Secondary: Edge, Brave (Chromium-based)
- Manifest V3 requirement limits older browser support

## Security Considerations
- Content script injection only on OBS domain
- No external network requests
- Local storage only for user preferences
- Cross-origin iframe access with error handling