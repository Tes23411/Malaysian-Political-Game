# Political World Game: Malaysia Edition

A deep, web-based political and economic simulation game inspired by the rich and complex political landscape of Malaysia. 

## Overview
This application is a comprehensive political, economic, and strategic simulator where players take control of a political party to navigate elections, manage coalitions, shape economic policy, and guide the nation through historical and dynamic challenges. 

## Features

### 🏛️ Political System
- **Elections & Parliament:** Dynamic election system resulting in a multi-party proportional or first-past-the-post parliamentary makeup.
- **Government Formation:** Complex coalition building. Negotiate with other parties, form alliances, and secure a majority to elect a Chief Minister.
- **Legislation & Lawmaking:** Propose bills (economic, social, religious, nationalist, constitutional) to the Parliament. AI parties vote based on their ideologies and affiliations. Constitutional bills require a 2/3 supermajority.
- **Internal Party Politics:** Characters, party leaders, and internal factions.

### 📈 Economic Simulation
- **Macroeconomics:** Manage GDP growth, inflation, unemployment, budget balance, and national debt.
- **Policy Control:** Set tax rates, manage government spending across different sectors, and adjust interest rates.
- **National Metrics:** Track Infrastructure quality, Human Capital, Corruption levels, and Public Approval.

### 🎯 Mission Trees & National Focus
Select from distinct national development pathways. Each tree contains 5 tiers and 35 sequential missions:
- **Bumiputera Agenda:** Focus on affirmative action and socio-economic restructuring.
- **Developmental State:** State-led infrastructure and sovereign wealth management.
- **Liberal Open Economy:** Deregulation, foreign direct investment, and free trade.
- **Socialist Welfare:** Redistribution, labour rights, and public ownership.
- **Export Tiger:** Industrialization, high-tech manufacturing, and trade dominance.
- **Federal Pluralism:** Decentralization and multicultural harmony.

Missions require fulfilling economic benchmarks, policy settings, or legislative approvals. Passing unique missions grants permanent legacy bonuses, triggers special events, or unlocks synergies with other mission trees. The AI automatically manages and progresses through missions for the governing party.

### 📜 Dynamic Event System
- Immersive events triggered by date, political actions, economic crises, or mission progression.
- Events offer narrative choices that can instantly shape public approval, impact the economy, or reshuffle party alliances.
- Comprehensive tracking through a chronological **Event Log** panel.

### 🗺️ Dynamic Electoral Map
- Interactive GeoJSON-powered map visualizing electoral districts, party strongholds, and voting demographics across the nation.

### 🎭 Demographics & Society
- Intricate population models taking into account different ethnic groups, religious affiliations, and urban/rural divides, directly impacting election outcomes and policy reception.

## Technical Architecture
- **Frontend Framework:** React 18+ (Functional components & Hooks)
- **Tooling:** Vite, TypeScript
- **Styling:** Tailwind CSS
- **Maps:** Leaflet & React-Leaflet
- **Icons:** Lucide React

## Development
To run the development server locally:
```bash
npm install
npm run dev
```

## How to Play
1. **Start:** Choose your starting party and leader.
2. **Campaign:** Manage resources and rhetoric heading into the general elections.
3. **Govern or Oppose:** Try to form a government after the election. If successful, manage the national economy, pass laws, and navigate crises. If in opposition, build your coalition for the next cycle.
4. **Missions:** Follow your selected mission tree by fulfilling economic and legislative requirements (e.g., passing the Business Deregulation Act) to unlock powerful national bonuses.

Enjoy the complex world of nation-building and political maneuvering!
