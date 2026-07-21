<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f4db37c5-3831-4ca8-b3c8-4fa172ed2bca

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `COHERE_API_KEY` in [.env.local](.env.local) for production chat responses, and `GEMINI_API_KEY` if you also want Gemini fallback support
3. Run the app:
   `npm run dev`
