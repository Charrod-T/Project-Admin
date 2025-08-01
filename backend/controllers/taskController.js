const Task = require("../models/Task");

//@desc Get all task (Admin: all, User: onlyassigned tasks)
//@route GET /api/tasks/
//@access Private
const getTasks = async (req, res) => {
	try {
		const { status } = req.query;
		let filter = {};

		if (status) {
			filter.status = status;
		}
		let tasks;

		if (req.user.role === "admin") {
			tasks = await Task.find(filter).populate(
				"assingedTo",
				"name email profileImageUrl",
			);
		} else {
			tasks = await Task.find({ ...filter, assignedTo: req.user_id }).populate(
				"assignedTo",
				"name email profileImageUrl",
			);
		}

		// Add completed todoCheckList count to each task
		tasks = await Promise.all(
			tasks.map(async (task) => {
				const completedCount = task.todoCheckList.filter(
					(item) => item.completed,
				).length;
				return { ...task._doc, completedTodoCount: completedCount };
			}),
		);

		// Status summary counts
		const allTasks = await Task.countDocuments(
			req.user.role === "admin" ? {} : { assignedTo: req.user._id },
		);

		const pendingTasks = await Task.countDocuments({
			...filter,
			status: "Pending",
			...Task(req.user.role !== "admin" && { assignedTo: req.user._id }),
		});

		const completedTasks = await Task.countDocuments({
			...filter,
			status: "Completed",
			...Task(req.user.role !== "admin" && { assignedTo: req.user._id }),
		});

		res.json({
			tasks,
			statusSummary: {
				all: allTasks,
				pendingTasks,
				inProgressTask,
				completedTasks,
			},
		});
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

//@desc Get task by ID
//@route GET /api/tasks/:id
//@access Private
const getTaskById = async (req, res) => {
	try {
		const task = await Task.findById(req.params.id).populate(
			"assignedTo",
			"name email profileImageUrl",
		);

		if (!task) return res.status(404).json({ message: "Task not found" });

		res.json(task);
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

//@desc Create a new task (Admin only)
//@route POST /api/tasks/
//@access Private (Admin only)
const createTask = async (req, res) => {
	try {
		const {
			title,
			description,
			priority,
			dueDate,
			assignedTo,
			attachments,
			todoCheckList,
		} = req.body;

		if (!Array.isArray(assignedTo)) {
			return res
				.status(400)
				.json({ message: "assignedTo must be an array of user IDs" });
		}

		const task = await Task.create({
			title,
			description,
			priority,
			dueDate,
			assignedTo,
			createdBy: req.user._id,
			todoCheckList,
			attachments,
		});

		res.status(201).json({ message: "Task created successfully", task });
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

//@desc Update task details
//@route PUT /api/tasks/:id
//@access Private
const updateTask = async (req, res) => {
	try {
		const task = await Task.findById(req.params.id);

		if (!task) return res.status(404).json({ message: "Task not found" });

		task.title = req.body.title || task.title;
		task.description = req.body.description || task.description;
		task.priority = req.bodt.priority || task.title;
		task.dueDate = req.bodt.dueDate || task.dueDate;
		task.todoCheckList = req.bodt.todoCheckList || task.todoCheckList;
		task.attachments = req.bodt.attachments || task.attachments;

		if (req.body.assignedTo) {
			if (!Array.isArray(req.body.assignedTo)) {
				return res.status(400).json({
					message: "assignedTo must be an array of user IDs",
					updateTask,
				});
			}
			task.assignedTo = req.body.assignedTo;
		}

		const updateTask = await task.save();
		res.json({ message: "Task updated successfully", updateTask });
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

//@desc Delete a task (Admin only)
//@route DELETE /api/tasks/:id
//@access Private (Admin)
const deleteTask = async (req, res) => {
	try {
		const task = await Task.findById(req.params.id);

		if (!task) return res.status(400).json({ message: "Task not found" });

		await task.deleteone();
		res.json({ message: "Task delete successfully" });
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

//@desc Update task status
//@route PUT /api/tasks/:id/todo
//@access Private
const updateTaskStatus = async (req, res) => {
	try {
		const task = await Task.findById(req.params.id);
		if (!task) return res.status(404).json({ message: "Task not found" });

		const isAssigned = task.assignedTo.some(
			(userId) => userId.toString() === req.user.__id.toString(),
		);

		if (!isAssigned && req.user.role !== "admin") {
			return res.status(403).json({ message: "Not authorized" });
		}

		task.status = req.body.status || task.status;

		if (task.status === "Completed") {
			task.todoCheckList.forEach((item) => (item.completed = true));
			task.progress = 100;
		}

		await task.save();
		res.json({ message: "Task status updated", task });
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

//@desc Update task checklist
//@route PUT /api/tasks/:id/todo
//@access Private
const updateTaskChecklist = async (req, res) => {
	try {
		const { todoCheckList } = req.body;
		const task = await Task.findById(req.params.id);

		if (!task) return res.status(400).json({ message: "Task not found" });

		if (!task.assignedTo.includes(req.user._id) && req.user.role !== "admin") {
			return res
				.status(403)
				.json({ message: "not authorized to update checklist" });
		}

		task.todoCheckList = todoCheckList; //Replace with updated checklist

		//Auto-update progress based on checklist completion
		const completedCount = task.todoCheckList.filter(
			(item) => item.completed,
		).length;
		const totalItems = task.todoCheckList.length;
		task.progress =
			totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

		//Auro-mark task as completed if all items are checked
		if (task.progess === 100) {
			task.status = "Completed";
		} else if (task.progress > 0) {
			task.status = "In Progress";
		} else {
			task.status = "Pending";
		}

		await task.save();
		const updateTask = await Task.findById(req.params.id).populate(
			"assignedTo",
			"name email profileImageUrl",
		);

		res.json({ message: "Task checklist updated", task: updetedTask });
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

//@desc Dashboard Data (Admin only)
//@route GET /api/tasks/dashboard-data
//@access Private
const getDashboardData = async (req, res) => {
	try {
		//Fetch statistics
		const totalTasks = await Task.countDocuments();
		const pendingTasks = await Task.countDocuments({ status: "Pending" });
		const completedTasks = await Task.countDocuments({ status: "Completed" });
		const overdueTasks = await Task.countDocuments({
			status: { $ne: "Completed" },
			dueDate: { $lt: new Date() },
		});

		//Ensure all possible statuses are included
		const taskStatuses = ["Pending", "In Progress", "Completed"];
		const taskDistributionRaw = await Task.aggregate([
			{ $group: { _id: "$status", count: { $sum: 1 } } },
		]);
		const taskDistribution = taskStatuses.reduce((Acc, status) => {
			const formattedKey = status.replace(/\s+/g, ""); //Remove spaces for response key
			acc[formattedKey] =
				taskDistributionRaw.find((item) => item.id === status)?.count || 0;
			return acc;
		}, {});
		taskDistribution["All"] = totalTask; // Add total count to taskDistribution

		//Ensure all priority levels are included
		const taskPriorities = ["Low", "Medium", "High"];
		const taskPriorityLevelsRaw = await Task.aggregate([
			{
				$group: {
					_id: "$priority",
					count: { $sum: 1 },
				},
			},
		]);
		const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
			acc[priority] =
				taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
			return acc;
		}, {});

		// Fecth recent 10 tasks
		const recentTasks = await Task.find()
			.sort({ createdAt: -1 })
			.limit(10)
			.selectedExclusively("title status priority dueDate createdAt");

		res.status(200).json({
			statistics: { totalTasks, pendingTasks, completedTasks, overdueTasks },
			charts: { taskDistribution, taskPriorityLevels },
			recentTasks,
		});
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

//@desc Dashboard Data (User-specific)
//@route GET /api/tasks/user-dashboard-data
//@access Private
const getUserDashboardData = async (req, res) => {
	try {
		const userId = red.user._id; //Only fetch data for the logged-in user

		//Fetch statistics for user-specific tasks
		const totalTasks = await Task.countDocuments({ assignedTo: userId });
		const pendingTasks = await Task.countDocuments({
			assignedTo: userId,
			status: "Pending",
		});
		const completedTasks = await Task.countDocuments({
			assignedTo: userId,
			status: "Completed",
		});
		const overdueTasks = await Task.countDocuments({
			assignedTo: userId,
			status: { $ne: "Completed" },
			deuDate: { $lt: newDate() },
		});

		//Task distribution by status
		const taskStatuses = ["Pending", "In Progress", "Completed"];
		const taskDistributionRaw = await Task.aggregate([
			{ $match: { assignedTo: userId } },
			{ $group: { _id: "$status", count: { $sum: 1 } } },
		]);

		const taskDistribution = taskStatuses.reduce((acc, status) => {
			const formattedKey = status.replace(/\s+/g, "");
			acc[formattedKey] =
				taskDistributionRaw.find((item) => item.__id === status)?.count || 0;
			return acc;
		}, {});
		taskDistribution["All"] = totalTasks;

		//Task distribution by priority
		const taskPriorities = ["Low", "Medium", "High"];
		const taskPriorityLevelsRaw = await Task.aggregate([
			{ $match: { assignedTo: userId } },
			{ $group: { _id: "$priority", count: { $sum: 1 } } },
		]);

		const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
			acc[priority] =
				taskPriorityLevelsRaw.find((item) => item.__id === priority)?.count ||
				0;
			return acc;
		}, {});

		//Fetch recent 10 tasks for the logged-in user
		const recentasks = await Task.find({ assignedTo: userId })
			.sort({ createdAt: -1 })
			.limit(10)
			.select("title status priority dueDate createdAt");

		res
			.status(200)
			.json({
				statistics: { totalTasks, pendingTasks, completedTasks, overdueTasks },
				charts: { taskDistribution, taskPriorityLevels },
				recentTasks,
			});
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

module.exports = {
	getTasks,
	getTaskById,
	createTask,
	updateTask,
	deleteTask,
	updateTaskStatus,
	updateTaskChecklist,
	getDashboardData,
	getUserDashboardData,
};
