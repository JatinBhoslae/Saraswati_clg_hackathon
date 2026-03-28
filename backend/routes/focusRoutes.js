// ============================================================
// 🎯 FOCUS ROUTES
// Handles focus mode toggle and state
// ============================================================

const express = require("express");
const router = express.Router();

module.exports = function (store) {
  // ---------------------------------------------------------
  // POST /api/focus — Toggle focus mode
  // Body: { focusMode: true/false }
  // ---------------------------------------------------------
  router.post("/focus", (req, res) => {
    const newMode = req.body.focusMode;

    if (typeof newMode !== "boolean") {
      return res.status(400).json({ error: "focusMode must be a boolean" });
    }

    store.setFocusMode(newMode);
    const state = store.getFocusState();

    console.log(`🎯 Focus Mode: ${state.focusMode ? "ON 🔴" : "OFF ⚪"}`);
    res.json({ focusMode: state.focusMode });
  });

  // ---------------------------------------------------------
  // GET /api/focus — Get focus mode status
  // ---------------------------------------------------------
  router.get("/focus", (req, res) => {
    const state = store.getFocusState();
    res.json({ focusMode: state.focusMode });
  });

  return router;
};
