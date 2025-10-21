# 🎨 PromptCut → Lovable Integration Guide

Complete guide to deploying PromptCut frontend on Lovable.dev

## 📦 Files Available

You have **TWO zip files**:

1. **`promptcut.zip`** (66 KB) - Full stack (frontend + backend + Python worker)
2. **`promptcut-lovable.zip`** (22 KB) - Lovable-ready frontend with mock data

## 🚀 Quick Start with Lovable

### Step 1: Go to Lovable
Visit: **https://lovable.dev**

### Step 2: Create New Project
- Click **"New Project"** or **"Create Project"**
- Choose **"React + TypeScript"** template

### Step 3: Upload PromptCut Frontend

**Option A: Use Mock Data (Recommended for Testing)**
1. Download `promptcut-lovable.zip`
2. Extract the files
3. In Lovable, use the file upload feature
4. Upload these files:
   - `src/` folder (all components)
   - `package.json`
   - `vite.config.ts`
   - `tailwind.config.js`
   - `tsconfig.json`
   - `index.html`

5. In `src/main.tsx`, change the import:
   ```typescript
   // Change this line in src/api/client.ts imports
   // FROM:
   import { projectsApi, mediaApi, ... } from './api/client';

   // TO:
   import { projectsApi, mediaApi, ... } from './api/client.mock';
   ```

6. Or simply rename files:
   ```bash
   mv src/api/client.ts src/api/client.real.ts
   mv src/api/client.mock.ts src/api/client.ts
   ```

**Option B: Connect to Deployed Backend**
1. First deploy the backend (see Backend Deployment below)
2. Upload frontend files
3. Set environment variables in Lovable:
   ```
   VITE_API_URL=https://your-backend-url.com
   ```

### Step 4: Install Dependencies

Lovable will auto-detect from `package.json`:
- React
- TypeScript
- TailwindCSS
- Zustand
- React Query
- Radix UI components

### Step 5: Run in Lovable

Click **"Run"** or **"Preview"** to see your app!

## 🎬 What Works in Mock Mode

With `client.mock.ts` you get:

✅ **Full UI/UX**
- Media bin with sample videos
- Timeline with demo clips
- Prompt input with suggestions
- Preview controls
- Export panel

✅ **Simulated Features**
- Mock video uploads (instant)
- AI prompt responses (2 sec delay)
- Timeline editing visualization
- Export status tracking

❌ **What Doesn't Work** (needs real backend)
- Actual file uploads to storage
- Real AI processing
- Video rendering
- Database persistence

## 🔧 Backend Deployment Options

To get full functionality, deploy the backend:

### Option 1: Railway (Recommended)

**Deploy Backend:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy backend
cd promptcut/backend
railway up
```

**Deploy Python Worker:**
```bash
cd promptcut/python
railway up
```

**Deploy Database:**
- Railway auto-provisions PostgreSQL
- Add Redis from Railway marketplace

### Option 2: Render

1. Go to https://render.com
2. Create **Web Service** for backend
3. Create **Background Worker** for Python service
4. Add **PostgreSQL** database
5. Add **Redis** instance

### Option 3: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy backend
cd promptcut/backend
fly launch

# Deploy Python worker
cd promptcut/python
fly launch
```

### Option 4: Supabase (Easiest for Lovable)

**Best integration with Lovable:**

1. Go to https://supabase.com
2. Create new project
3. Use Supabase features:
   - **Database** → PostgreSQL (built-in)
   - **Storage** → File uploads (replaces S3)
   - **Edge Functions** → Backend logic (replaces Express)
   - **Realtime** → WebSocket updates

4. In Lovable, install Supabase client:
   ```bash
   npm install @supabase/supabase-js
   ```

5. Update `src/api/client.ts`:
   ```typescript
   import { createClient } from '@supabase/supabase-js'

   const supabase = createClient(
     'YOUR_SUPABASE_URL',
     'YOUR_SUPABASE_ANON_KEY'
   )
   ```

## 🔗 Connecting Lovable Frontend to Backend

Once backend is deployed:

### In Lovable Project Settings:

1. Click **Settings** or **Environment Variables**
2. Add:
   ```
   VITE_API_URL=https://promptcut-backend.railway.app
   VITE_WS_URL=wss://promptcut-backend.railway.app
   ```

3. Update CORS in backend to allow Lovable domain:
   ```typescript
   // backend/src/index.ts
   app.use(cors({
     origin: ['https://your-app.lovable.app', 'http://localhost:5173']
   }))
   ```

## 📝 Lovable AI Prompts

Ask Lovable AI to help you:

**For Mock Data:**
- "Add more sample videos to the mock data"
- "Create a demo mode toggle to switch between real and mock API"
- "Add sample prompts that showcase different editing styles"

**For Supabase Integration:**
- "Convert this app to use Supabase for backend"
- "Add Supabase storage for video uploads"
- "Create Supabase edge function for AI prompt processing"

**For UI Improvements:**
- "Make the timeline more interactive with drag and drop"
- "Add keyboard shortcuts for playback controls"
- "Improve the mobile responsive layout"

## 🎨 Customizing in Lovable

### Easy Changes:
- **Colors**: Edit `tailwind.config.js` and `src/index.css`
- **Layout**: Modify components in `src/components/`
- **Features**: Ask Lovable AI to add new capabilities

### Example Prompts for Lovable AI:
- "Add a dark/light mode toggle"
- "Create a library of preset editing styles"
- "Add undo/redo buttons to the UI"
- "Make clips draggable on the timeline"

## 🌐 Deployment from Lovable

Lovable can deploy to:
- **Lovable Hosting** (built-in, easiest)
- **Netlify**
- **Vercel**
- **GitHub Pages**

Just click **Deploy** in Lovable!

## 📚 Resources

- **Lovable Docs**: https://docs.lovable.dev
- **PromptCut Docs**: See `promptcut/README.md`
- **API Reference**: See `promptcut/docs/API.md`
- **Sample Prompts**: See `promptcut/docs/PROMPTS.md`

## 🆘 Troubleshooting

### "Module not found" errors
- Make sure all dependencies are in `package.json`
- Click "Reinstall Dependencies" in Lovable

### "API calls failing"
- Using mock mode? Check import in components
- Using real backend? Verify VITE_API_URL is set

### "Styling looks broken"
- Ensure `tailwind.config.js` is uploaded
- Check `postcss.config.js` is present
- Verify `src/index.css` has Tailwind imports

### "TypeScript errors"
- Lovable auto-fixes most TS issues
- Check `tsconfig.json` is uploaded

## ✨ Next Steps

1. **Start with mock mode** to test UI
2. **Deploy backend** when ready for full functionality
3. **Use Lovable AI** to enhance features
4. **Deploy** to production when satisfied

---

**Happy building in Lovable!** 🎨🚀

For questions, refer to:
- Full README: `promptcut/README.md`
- Quick Start: `promptcut/QUICKSTART.md`
