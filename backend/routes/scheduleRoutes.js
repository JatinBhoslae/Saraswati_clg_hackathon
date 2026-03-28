const express = require('express');

module.exports = function(store) {
  const router = express.Router();

  // GET current config & mode
  router.get('/status', (req, res) => {
    res.json({
      activeMode: store.getCurrentMode(),
      schedulerEnabled: store.getSchedulerEnabled(),
      schedules: store.getSchedules(),
      calendarEvents: store.getCalendarEvents(),
      manualOverride: store.getManualOverride()
    });
  });

  // GET all schedules
  router.get('/', (req, res) => {
    res.json({ schedules: store.getSchedules() });
  });

  // POST create a schedule
  router.post('/', async (req, res) => {
    try {
      const schedule = await store.addSchedule(req.body);
      res.json({ success: true, schedule });
    } catch (err) {
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  // DELETE a schedule
  router.delete('/:id', async (req, res) => {
    try {
      await store.removeSchedule(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // PUT update a schedule
  router.put('/:id', async (req, res) => {
    try {
        const schedule = await store.updateSchedule(req.params.id, req.body);
        res.json({ success: true, schedule });
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
  });

  // TOGGLE scheduler globally
  router.post('/toggle', (req, res) => {
    const { enabled } = req.body;
    store.setSchedulerEnabled(enabled);
    res.json({ success: true, enabled });
  });

  // CLEAR MANUAL OVERRIDE
  router.post('/clear-override', (req, res) => {
    store.setManualOverride(false);
    res.json({ success: true, activeMode: store.getCurrentMode() });
  });

  return router;
};
