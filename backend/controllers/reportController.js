const Task = require("../models/Task");
const User = require("../models/User");
const excelJS = require("exceljs");

//@desc Eport all tasks as an Excel file
//@route GET /api/reports/export/tasks
//access Private (Admin)
const exportTasksReport = async (req, res) => {
	try {
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error exporting tasks", error: error.message });
	}
};

//@desc Eport user-tasks report as an Excel file
//@route GET /api/reports/export/users
//access Private (Admin)
const exportUsersReport = async (req, res) => {
	try {
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error exporting tasks", error: error.message });
	}
};

module.exports = { exportTasksReport, exportUsersReport };
