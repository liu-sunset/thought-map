# LightMap CN - Master Design Document (PRD)

## 1. Project Overview
*   **App Name**: LightMap CN (点亮中国)
*   **One-Liner**: A minimalist, interactive dark-mode map of China where users "light up" their province based on real-world IP location and leave anonymous messages.
*   **Target Audience**: Internet users in China who want to share thoughts anonymously with people in their region or across the country.
*   **Design Philosophy**: "Apple Dark Mode" aesthetic. Extremely minimalist, high contrast (Black #000000 with red heat accents), rounded corners, smooth motion, blur effects.

## 2. App Flow & User Stories
### Key User Flows
1.  **Landing & Detection**:
    *   User opens the site.
    *   System silently detects IP address and resolves to Province (e.g., "Beijing").
    *   **IF IP is Foreign/Unknown**: Show a polite message: "Location outside service area" (or similar), allow "Guest View" (read-only) or map to "Overseas" node if desired.
    *   **IF IP is Local (e.g., Beijing)**:
        *   Map centers/highlights Beijing.
        *   A floating "Light Up Beijing" (点亮北京) button appears in the bottom right with a pulsing glow.
2.  **The "Light Up" Action**:
    *   User clicks the button.
    *   **Backend Check**: Has this IP "lit up" today?
    *   **Success**:
        *   Beijing's heat level +1.
        *   Map color for Beijing deepens slightly (Realtime update).
        *   Button changes to "Enter Message Board" (进入留言板).
    *   **Already Lit**: Button directly shows "Enter Message Board".
3.  **Browsing**:
    *   User can click ANY province on the map.
    *   Right side (desktop) or Bottom sheet (mobile) panel slides out showing messages for that province.
    *   Province color intensity represents total "Light Ups" (Gray -> Red).
4.  **Messaging**:
    *   User views the message list for a selected province.
     *   **Content Restrictions**: Messages support **Text and standard Emojis only**. Audio, Video, Images, and File uploads are strictly prohibited.
    *   **Search**: Input box to filter messages within this province.
    *   **Post**:
        *   Input box is **only enabled** if the selected province matches the User's IP.
        *   User types message -> Clicks Send.
        *   System sanitizes content (replace bad words with `***`).
        *   System checks rate limit (e.g., 1 message per minute per IP).
        *   Message appears instantly.

### Edge Cases
*   **Localhost Development**: Local IP (127.0.0.1) has no geo-info. **Solution**: Add a "Dev Mode" selector in UI (visible only when `NODE_ENV=development`) to manually spoof a province.
*   **VPN/Proxy**: If IP is datacenter/proxy, treat as "Unknown" or "Overseas".

## 3. Tech Stack & Constants
*   **Selected Stack (Option A)**:
    *   **Framework**: Next.js 14+ (App Router).
    *   **Language**: TypeScript (Strict).
    *   **Styling**: Tailwind CSS + Shadcn/UI (Radix Primitives).
    *   **Icons**: Lucide React.
    *   **Map Visualization**: ECharts (China GeoJSON map) for interactive province rendering.
    *   **Database**: Supabase (PostgreSQL).
    *   **ORM**: Prisma (preferred for schema clarity) or Drizzle. *Decision: Prisma for better AI context.*
    *   **State/Auth**: No user accounts. IP-based identity.
*   **External Services**:
    *   **IP Geolocation**: `ip-api.com` (free, non-commercial) or a local offline database (e.g., `geoip-lite`) to reduce latency. *Decision: Use an offline library or efficient API to minimize external deps.*
*   **Environment Variables**:
    *   `DATABASE_URL` (Supabase connection string)
    *   `DIRECT_URL` (Supabase direct connection)
    *   `NEXT_PUBLIC_BASE_URL`

## 4. Design System & UI/UX
*   **Color Palette**:
    *   **Background**: `#000000` (Pure Black) or `#09090b` (Zinc-950).
    *   **Surface**: `#18181b` (Zinc-900) with slight transparency/blur (`backdrop-filter: blur(12px)`).
    *   **Primary (Green)**: `#22c55e` (Green-500) to `#15803d` (Green-700).
    *   **Text**: `#fafafa` (Zinc-50) for headings, `#a1a1aa` (Zinc-400) for secondary.
*   **Typography**:
    *   San-serif, clean. `Inter` or system fonts (`-apple-system`).
*   **Component Library**: Shadcn/UI.
    *   Buttons: Rounded-full (Capsule shape).
    *   Cards: High border-radius (e.g., `rounded-3xl`), thin borders (`border-zinc-800`).
*   **Layout Structure**:
    *   **Desktop**: Split screen. Left 70% Map (Fixed), Right 30% Message Panel (Scrollable).
    *   **Mobile**: Map takes 100%. Message Panel is a drawer/sheet that slides up.

## 5. Database Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Province {
  id        String   @id @default(cuid())
  name      String   @unique // e.g., "Beijing", "Guangdong"
  cnName    String   // e.g., "北京", "广东"
  count     Int      @default(0) // Total "Light Ups"
  level     Int      @default(0) // Calculated level for color intensity (0-5)
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Message {
  id         String   @id @default(cuid())
  content    String
  province   Province @relation(fields: [provinceId], references: [id])
  provinceId String
  ipHash     String   // Anonymized IP hash for basic moderation
  createdAt  DateTime @default(now())
  
  @@index([provinceId])
}

model IpLog {
  id         String   @id @default(cuid())
  ipHash     String
  action     String   // "LIGHT_UP"
  createdAt  DateTime @default(now())
  
  // Composite index to check "Did this IP light up today?" quickly
  // We will query by ipHash + date in code
}
```

## 6. API Interface & Server Actions
*   Since we use Next.js App Router, we prioritize **Server Actions**.

### Server Actions (`/lib/actions.ts`)
1.  `getGeoInfo(ip: string)`: Returns `{ province: string, allowed: boolean }`.
2.  `lightUpProvince(provinceName: string)`:
    *   Checks IP rate limit (1 per day).
    *   Increments `Province.count`.
    *   Returns new count.
3.  `postMessage(provinceName: string, content: string)`:
    *   Checks IP location match (Must match provinceName).
    *   Checks rate limit (1 per minute).
    *   Sanitizes content (bad words -> `***`).
    *   Saves to DB.
4.  `getMessages(provinceName: string, page: number)`:
    *   Returns paginated messages.

## 7. Project File Structure
```
.
├── app/
│   ├── layout.tsx       # Global layout, dark mode provider
│   ├── page.tsx         # Main entry, loads MapContainer
│   ├── globals.css      # Tailwind imports
│   └── api/             # (Optional) Cron jobs or external webhooks
├── components/
│   ├── ui/              # Shadcn components (Button, Input, Sheet...)
│   ├── map/
│   │   ├── ChinaMap.tsx # SVG/Canvas map component
│   │   └── Province.tsx
│   ├── panel/
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── LightUpButton.tsx
│   └── DevTools.tsx     # Localhost IP spoofer
├── lib/
│   ├── prisma.ts        # DB client
│   ├── utils.ts         # CN class merger
│   ├── actions.ts       # Server actions
│   ├── constants.ts     # Province names mapping, Bad words list
│   └── ip-utils.ts      # IP detection logic
├── prisma/
│   └── schema.prisma
└── public/
    └── map-data.json    # GeoJSON for China
```

## 8. AI Context & Coding Standards
**Project Rules & Context**
*   **Tech Constraints**: Use Next.js App Router. Use Server Actions for all data mutations. Use Prisma for DB interactions.
*   **Coding Style**:
    *   Use Functional Components with TypeScript interfaces.
    *   Strict typing is mandatory. No `any`.
    *   Use `export const` for components.
    *   Use `lucide-react` for icons.
*   **UI Rules**:
    *   Always use components from `@/components/ui`.
    *   **Dark Mode Only**: Force dark mode in Tailwind config (`darkMode: 'class'`).
    *   **Responsiveness**: Mobile-first approach.
*   **Error Handling**:
    *   Server Actions should return `{ success: boolean, error?: string, data?: any }`.
    *   UI should display toast notifications (Sonner) for errors.
*   **Local Development**:
    *   Check `process.env.NODE_ENV`. If 'development', allow bypassing IP checks via a UI toggle.

## 9. Atomic Implementation Roadmap

### Phase 1: Foundation
*   **Step 1.1**: Initialize Next.js project with TypeScript, Tailwind, ESLint.
*   **Step 1.2**: Install Shadcn/UI and add core components (Button, Input, ScrollArea, Sheet/Drawer, Toast).
*   **Step 1.3**: Configure Tailwind for "Apple Dark Mode" (Zinc colors, radius).

### Phase 2: Data Layer
*   **Step 2.1**: Set up Prisma with the defined schema.
*   **Step 2.2**: Create a seed script to populate the `Province` table with all China provinces (CN and EN names).
*   **Step 2.3**: Set up Supabase project (User must provide URL) and run migration.

### Phase 3: Backend Logic & Utils
*   **Step 3.1**: Implement `ip-utils.ts` to detect IP from headers (`x-forwarded-for`) and map to province. **Crucial**: Implement the "Mock IP" logic for localhost.
*   **Step 3.2**: Implement `actions.ts` - `lightUpProvince` with daily rate limiting logic.
*   **Step 3.3**: Implement `actions.ts` - `postMessage` with content filtering (simple list check).

### Phase 4: Frontend - Map Core
*   **Step 4.1**: Find and integrate a China Map SVG/GeoJSON. Create `ChinaMap.tsx`.
*   **Step 4.2**: Make the map interactive. Clicking a province selects it and updates global state (Zustand or Context).
*   **Step 4.3**: Bind map colors to data. Fetch province "levels" and apply CSS classes (gray -> green gradient).

### Phase 5: Frontend - Interaction
*   **Step 5.1**: Build the "Light Up" Floating Button. Logic: Show only if current IP matches detected province (or Dev Mode).
*   **Step 5.2**: Build the Side Panel / Drawer. Show selected province name and stats.
*   **Step 5.3**: Implement Message List & Input. Connect to `postMessage` action.
*   **Step 5.4**: Add the "DevTools" widget (bottom left, small opacity) to switch "Current IP Location" for testing.

### Phase 6: Polish
*   **Step 6.1**: Add animations (Framer Motion or Tailwind Animate). Map hover effects, panel slide-in.
*   **Step 6.2**: Final review of "Black & Green" aesthetic. Ensure text contrast.
*   **Step 6.3**: Verify IP logic works in production (simulate with headers).
