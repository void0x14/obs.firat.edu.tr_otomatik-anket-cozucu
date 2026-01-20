# Project Brief: Fırat OBS Otomatik Anket Çözücü

## Core Purpose
A Manifest V3 browser extension that automatically fills out surveys in Fırat University's OBS (Student Information System) with a sophisticated navigation and observation engine.

## Key Requirements
1. **Automatic Survey Detection**: Detect unfilled surveys in the OBS survey list
2. **Smart Form Filling**: Fill survey forms with user-selected scores (1-5 scale)
3. **Navigation Flow Control**: Handle OBS's complex iframe structure and ASP.NET postback system
4. **Exit-Reenter Logic**: After saving a survey, trigger parent window menu to refresh the list
5. **Modal Management**: Automatically close blocking overlays and confirmation dialogs
6. **AKTS/Workload Handling**: Intelligently fill workload-related text inputs

## Technical Constraints
- Must work with OBS's iframe-based architecture
- Must handle ASP.NET state management (Postback)
- Must simulate real user events for form validation
- Must work across different survey formats (radios, selects, text inputs)

## Success Criteria
- User can set preferred survey score (1-5) via popup
- Extension automatically finds and enters unfilled surveys
- Forms are filled correctly with proper event simulation
- Navigation flow continues seamlessly between surveys
- All surveys can be completed with minimal user intervention (just clicking "Save")

## Current Status
- Extension is functional but user reports hours of frustration
- Core functionality exists but may have reliability issues
- Need to identify and fix critical problems quickly