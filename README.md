# CryptoXata

This is a React application built with Vite, Tailwind CSS, and Supabase.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (comes with Node.js)

## Getting Started Locally

1. **Extract the downloaded ZIP file** to a folder on your computer.
2. **Open your terminal** and navigate to that folder:
   ```bash
   cd path/to/cryptoxata
   ```
3. **Install the dependencies**:
   ```bash
   npm install
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```
5. **Open your browser** and go to `http://localhost:3000` (or the URL shown in your terminal).

## Using with Claude Code

Since you mentioned using Claude Code, you can simply navigate to the extracted project folder in your terminal and start Claude Code:

```bash
cd path/to/cryptoxata
claude
```

Claude Code will automatically detect the `package.json`, `vite.config.ts`, and the React structure, and can help you modify the components, add new features, or refactor the code.

## Project Structure

- `src/App.tsx`: Main application component and routing.
- `src/components/`: UI components (Dashboard, Simulator, Modals, etc.).
- `src/services/`: Data fetching and Supabase synchronization logic.
- `src/types.ts`: TypeScript interfaces and types.
- `src/constants.ts`: Global constants and initial state.

## Environment Variables

Currently, the Supabase URL and Key are hardcoded in `src/services/dataService.ts` for ease of use in the preview environment. If you plan to deploy this to production, it is highly recommended to move these to a `.env` file:

1. Create a `.env` file in the root directory.
2. Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_KEY=your_supabase_anon_key
   ```
3. Update `src/services/dataService.ts` to use `import.meta.env.VITE_SUPABASE_URL` instead of the hardcoded strings.
