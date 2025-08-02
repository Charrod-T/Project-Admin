const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/exports/tasks", protect, adminOnly, exportTasksReport); //Export all tasks as Excel/PDF
router.get("/exports/users", protect, adminOnly, exportUsersReport); //Export all user-task report

module.exports = router;
