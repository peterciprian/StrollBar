// Manual Vercel Serverless Function entry: bypasses Vercel's zero-config Angular
// detection (which isn't wiring an SSR Function for this build), reusing the
// already-built Express + AngularNodeAppEngine server via Angular's own
// documented createNodeRequestHandler export.
export { reqHandler as default } from '../dist/strollbar-frontend/server/server.mjs';
