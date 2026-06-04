# Guidelines for Political World Game

## Purpose & Scope
This document outlines the core development, architectural, and design principles for the **Political World Game**. It serves as a North Star for contributors and maintainers to ensure technical consistency, scalability, and an immersive gameplay experience. These guidelines apply to all code contributions—ranging from complex UI/UX front-end changes to core logic expansions, economic simulations, and narrative event writing.

## Key Rules & Standards

### 1. Robust State Management
The game's engine orchestrates complex, intertwined states governing Economics, Politics, Demographics, and Mission Trees. To avoid race conditions and unpredictable behavior, state updates must be cleanly separated and predictable.
* **Maintain Immutable State:** Always return new objects, arrays, and maps when updating the active game state. Do not directly mutate data structures.
* **Unified Game Loop:** All temporal mechanics (time advancement, economic ticks, event checking) should flow through the central `processTurn` or equivalent timeline advancement functions.

### 2. Economic & Demographic Determinism
Electoral outcomes and event triggers should rely heavily on underlying economic and demographic metrics rather than pure randomness.
* **Data-Driven Mechanics:** Seat swings, public approval, and ideological shifts must factor in local human capital, regional wealth, and corruption metrics.
* **Avoid Hardcoding Variables:** Use flexible multipliers, caps, and base values (preferably abstracted to shared constants files) rather than magic numbers scattered in the logic.

### 3. Modularity in Narrative Content
The event system and national mission trees are expansive and need to grow continuously.
* **Decoupled Logic:** Keep event triggers, mission definitions, and economic updates in their respective utility modules (e.g., `utils/events.ts`, `utils/missionTrees.ts`, `utils/economics.ts`).
* **Strict Type Contracts:** Ensure newly added missions, parties, and events strictly adhere to the established TypeScript interfaces (`Mission`, `GameEvent`, `Party`, etc.) defined in `types.ts`.

### 4. UI/UX: The "Political Dashboard" Aesthetic
The interface acts as a comprehensive command center for a political operator.
* **Styling Paradigm:** Use Tailwind CSS exclusively for styling. Maintain the existing color palette (dark slates, vibrant interactive accents) and standard typographic scales.
* **Responsive Layouts:** Prioritize information density on large screens using multi-column grid layouts and sidebars. Ensure these collapse gracefully into accessible modal views or tabbed layouts on smaller viewports.

## Examples: Do's and Don'ts

### Event and State Mutations

**Do:** Use defined interfaces and pure functions.
```typescript
// Good
export const handleEconomicShock = (currentState: GameState): GameState => {
  return {
    ...currentState,
    economy: {
      ...currentState.economy,
      gdpGrowth: currentState.economy.gdpGrowth - 2.5,
      funds: currentState.economy.funds - 1000
    }
  };
};
```

**Don't:** Mutate state directly or ignore types.
```typescript
// Bad
export const handleEconomicShock = (state: any) => {
  state.economy.gdpGrowth -= 2.5; // Direct mutation!
  state.economy.funds -= 1000;
  return state;
};
```

### UI Component Structure

**Do:** Extract complex sub-views into separate, focused components.
```tsx
// Good
import SeatDistributionChart from './SeatDistributionChart';

const ElectionResultsPanel = ({ results, onAcknowledge }) => (
  <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
    <h2 className="text-xl font-bold text-slate-100 mb-4">Election Results</h2>
    <SeatDistributionChart data={results.seats} />
    <button onClick={onAcknowledge} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
      Continue
    </button>
  </div>
);
```

**Don't:** Build monolithic components that handle layout, data fetching, local UI state, and deep SVG rendering all in one file.

## TypeScript Standards
- Enable and respect TypeScript strict mode.
- Avoid the use of `any`; always define and export robust interfaces and types in `types.ts`.
- Prefer exhaustive `switch` statements or record mapping when dealing with known union types (like `Ideology` or `Ethnicity`).

## File Documentation Summaries

### `utils/events.ts`
- **Overview:** Manages random narrative events. Tracks chance based on dates and processes target effects like boosting party influences or dropping unaligned character metrics.
- **Dependencies:** Imports the foundational game entity definitions from `types.ts`.
- **Functions:** 
  - `checkForGameEvent`: Runs RNG tests against demographic and player metrics to spawn an event context.
  - `applyEventEffects`: Maps the spawned event back into global state mutators to execute permanent data adjustments.

### `utils/economics.ts`
- **Overview:** Extends base metrics into a fully realized, cyclical macro-economic simulation engine. Maps infrastructure and education into output growth rate multipliers while degrading based on factors like inequality and corruption.
- **Dependencies:** Extends properties documented in `types.ts`.
- **Functions:**
  - `calculateEconomicApproval`: Formulaically scores population satisfaction using non-linear sentiment algorithms (e.g. loss aversion penalties on sinking GDP).
  - `enqueuePolicyChange`: Stages structural market transitions behind lag boundaries to simulate real-world delays.
  - `updateEconomy`: The primary stepper advancing all state counters (sectors tracking, confidence intervals, infrastructure decay).
  - `aiManageEconomy`: Determines programmatic decisions for AI factions evaluating against dynamic inflation thresholds.

### `utils/missionTrees.ts`
- **Overview:** Validates and administrates static ideological mission nodes. Serves as a requirements engine ensuring cross-tree synergies and tracking completion legacy across government tenures.
- **Dependencies:** Accesses explicit tree node configurations from `missionTrees_part*.ts` registries and interfaces from `types.ts`.
- **Functions:**
  - `getUnlockedTrees`: Audits the player’s active ideology bounds to parse allowed narrative routes.
  - `detectCrisisMissions`: Overrides manual selections to force "Crisis" missions via automated triggers (e.g., hyperinflation limits).
  - `checkMissionRequirements`: Tests economic variables against numeric bounds prescribed by a specific template node.
  - `startMission` & `processMissionTick`: Pushes valid nodes onto the execution queue, iterating their timelines until completion.
  - `aiManageMissions`: Executes mission tree behavior autonomously for active AI administrations.

### `types.ts`
- **Overview:** Standardizes the object signatures of internal architecture classes ensuring type-safe implementations module-wide.
- **Key Entities:**
  - `Party`: Encompasses political hierarchies, financial resources, and dynamic relationships.
  - `Character`: Represents the individual actor variables (influence levels, demographic background).
  - `GameEvent`: Structs narrative popup interactions containing context and programmatic resolutions.
  - `EconomicState`: Ground truth properties scaling from base statistics to nested composite sectors.

The following libraries and plugins are used in this project:

### Core Framework
- **React (`react`, `react-dom`)**: The foundational UI library for building the game's interface.
- **Vite (`vite`)**: The build tool and development server, ensuring fast recompilation and optimized production builds.
- **TypeScript (`typescript`)**: Provides static typing to ensure robust code, especially for state management and game logic contracts.

### UI & Visualization
- **Tailwind CSS**: Utility-first CSS framework used exclusively for all styling across the dashboard and game components.
- **Lucide React (`lucide-react`)**: The standard icon library used for consistent iconography throughout the game UI.
- **Recharts (`recharts`)**: Used for rendering data-driven charts and graphs (e.g., economic history, seat distributions).
- **Motion (`motion`)**: Handles complex animations and smooth transitions across the user interface.
- **React XArrows (`react-xarrows`)**: Employed to visually connect elements, such as rendering relationships in the party network graph.

### Mapping & Geolocation
- **Leaflet (`leaflet`)**: The core interactive map library used to render the electoral map and districts.
- **React Leaflet (`react-leaflet`)**: React bindings for Leaflet, allowing the map to be controlled declaratively within the React component tree.

