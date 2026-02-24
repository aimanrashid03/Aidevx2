# Aidevx

Aidevx is a modern, web-based project management and document-creation tool designed to streamline requirements engineering. It allows teams to create, edit, preview, and export standard requirement documents (BRS, URS, etc.) seamlessly.

## ✨ Features

- **Project Management:** Organize documents by projects with dedicated workspaces.
- **Rich Text Editing:** Advanced block-based editor powered by Tiptap for drafting requirement sections.
- **Document Previews:** Native in-browser `.docx` preview engine without generating external files first.
- **Export & Share:** Instantly export documents to Word (`.docx`) using templated generation.
- **Modern Interface:** A sleek, fully responsive UI built with React, Tailwind CSS, and Lucide React icons.
- **Backend Ready:** Pre-configured to work with a Supabase PostgreSQL backend for authentication and database management.

## 🛠 Tech Stack

- **Frontend Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Autoprefixer
- **Editor:** Tiptap (ProseMirror based)
- **Document Generation:** docxtemplater, PizZip, file-saver, docx-preview
- **Backend / Database:** Supabase
- **Routing:** React Router v7
- **Fonts:** Public Sans & Source Sans Pro

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed along with `npm` (or your preferred package manager). You will also need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed if you wish to run the backend locally.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aimanrashid03/Aidevx2.git
   cd Aidevx2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the local Supabase environment (optional):
   ```bash
   npx supabase start
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173`.

## 📦 Build for Production

To create a production-ready build:

```bash
npm run build
```

This will run TypeScript checks and output the optimized bundle into the `dist/` directory.

## 📜 License

This project is proprietary. All rights reserved.
