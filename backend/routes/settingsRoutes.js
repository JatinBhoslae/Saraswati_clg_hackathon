const express = require("express");
const router = express.Router();

module.exports = function (store) {
  // GET /api/custom-sites
  router.get("/custom-sites", (req, res) => {
    res.json({ sites: store.getCustomSites() });
  });

  // POST /api/custom-sites
  // Add a new site
  router.post("/custom-sites", (req, res) => {
    const { site } = req.body;
    if (!site) return res.status(400).json({ error: "Site is required" });
    store.addCustomSite(site);
    res.json({ success: true, sites: store.getCustomSites() });
  });

  // DELETE /api/custom-sites
  // Remove a site
  router.delete("/custom-sites", (req, res) => {
    const { site } = req.body;
    if (!site) return res.status(400).json({ error: "Site is required" });
    store.removeCustomSite(site);
    res.json({ success: true, sites: store.getCustomSites() });
  });

  // GET /api/keywords
  router.get("/keywords", (req, res) => {
    res.json({ keywords: store.getPriorityKeywords() });
  });

  // POST /api/keywords
  router.post("/keywords", (req, res) => {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: "Keyword is required" });
    store.addPriorityKeyword(keyword);
    res.json({ success: true, keywords: store.getPriorityKeywords() });
  });

  // DELETE /api/keywords
  router.delete("/keywords", (req, res) => {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: "Keyword is required" });
    store.removePriorityKeyword(keyword);
    res.json({ success: true, keywords: store.getPriorityKeywords() });
  });

  return router;
};
