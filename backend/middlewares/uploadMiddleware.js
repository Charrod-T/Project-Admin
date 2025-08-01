const multer = require("multer");

//Configure storage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/");
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});

//File filter
const fileFilter = (req, file, cb) => {
	constallowedTypes = ["image/jpeg", "image/png", "image/jpg"];
	if (allowedTypes.includes(filemimetype)) {
		cb(null, true);
	} else {
		cb(new Error("Only .jpeg, .jpg and .png formats are allowed"), false);
	}
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
