import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// ⚠️ TEMPORARY: pointing at the dev harness so this module can be
// tested end-to-end before the co-director's real App.jsx exists.
// Swap this import for the real, merged App.jsx once it does — only
// _dev_harness/ goes away; src/shared/ and src/portal/ don't change.
import DevApp from "../_dev_harness/DevApp.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <DevApp />
    </BrowserRouter>
  </StrictMode>
);
