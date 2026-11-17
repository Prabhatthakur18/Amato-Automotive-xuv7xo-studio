// Entry for public/js/offline-runtime.js — the render engine bundled as one
// classic script, embedded into "Download HTML" files. Rebuild after editing
// page.js / model.js:  npm run build:offline
import { ProposalPage } from "../public/js/page.js";
new ProposalPage(window.__DATA__).render();
