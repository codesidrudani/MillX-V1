const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const masterController = require("../controllers/masterController");
const incomingController = require("../controllers/incomingController");
const outgoingController = require("../controllers/outgoingController");
const reportController = require("../controllers/reportController");
const recordsController = require("../controllers/recordsController");
const dashboardController = require("../controllers/dashboardController");
const superadminController = require("../controllers/superadminController");
const authenticate = require("../middlewares/auth");
const authorize = require("../middlewares/rbac");

// Public routes
router.post("/auth/login", authController.login);

// Protected routes (All logged-in users)
router.get("/auth/me", authenticate, authController.me);

// Admin-only routes
router.get("/users", authenticate, authorize(["admin"]), userController.getUsers);
router.post("/users", authenticate, authorize(["admin"]), userController.createUser);
router.delete("/users/:id", authenticate, authorize(["admin"]), userController.deleteUser);

// Dashboard Route
router.get("/dashboard", authenticate, dashboardController.getDashboardStats);

// Master Routes
['timberType', 'party', 'source', 'sourceType'].forEach(master => {
  router.get(`/${master}`, authenticate, masterController[master].getAll);
  router.post(`/${master}`, authenticate, authorize(["admin"]), masterController[master].create);
  router.put(`/${master}/:id`, authenticate, authorize(["admin"]), masterController[master].update);
  router.delete(`/${master}/:id`, authenticate, authorize(["admin"]), masterController[master].delete);
});
router.get("/masters/all", authenticate, masterController.getAllMasters);

// Inventory & Operations Routes
router.post("/incoming", authenticate, authorize(["admin", "data_entry"]), incomingController.createIncomingBatch);
router.get("/inventory/in-stock", authenticate, authorize(["admin", "data_entry", "report_viewer"]), incomingController.getInStockInventory);
router.post("/outgoing", authenticate, authorize(["admin", "data_entry"]), outgoingController.createOutgoingBatch);

// Records Routes (Admin only)
router.get("/records/incoming", authenticate, authorize(["admin"]), recordsController.getIncoming);
router.get("/records/outgoing", authenticate, authorize(["admin"]), recordsController.getOutgoing);
router.delete("/records/incoming/:id", authenticate, authorize(["admin"]), recordsController.deleteIncoming);
router.delete("/records/outgoing/:id", authenticate, authorize(["admin"]), recordsController.deleteOutgoing);
router.get("/records/audit-logs", authenticate, authorize(["admin"]), recordsController.getAuditLogs);

// Partial Edit Routes
router.put("/records/incoming/:id/header", authenticate, authorize(["admin"]), recordsController.updateIncomingHeader);
router.put("/records/outgoing/:id/header", authenticate, authorize(["admin"]), recordsController.updateOutgoingHeader);
router.delete("/records/incoming/logs/:id", authenticate, authorize(["admin"]), recordsController.deleteIncomingLog);
router.delete("/records/incoming/sizes/:id", authenticate, authorize(["admin"]), recordsController.deleteIncomingSize);
router.post("/records/incoming/:id/items", authenticate, authorize(["admin"]), recordsController.addIncomingItem);

router.delete("/records/outgoing/produced/:id", authenticate, authorize(["admin"]), recordsController.deleteOutgoingProducedSize);
router.delete("/records/outgoing/usages/:type/:id", authenticate, authorize(["admin"]), recordsController.deleteOutgoingUsage);
router.post("/records/outgoing/:id/produced", authenticate, authorize(["admin"]), recordsController.addOutgoingProducedSize);

// Reporting Routes
router.get("/reports", authenticate, authorize(["admin", "report_viewer"]), reportController.getReports);
router.get("/reports/registers", authenticate, authorize(["admin", "report_viewer"]), reportController.getRegisters);

// Superadmin Routes
router.get("/superadmin/mills", authenticate, authorize(["superadmin"]), superadminController.getMills);
router.post("/superadmin/mills", authenticate, authorize(["superadmin"]), superadminController.createMill);
router.put("/superadmin/mills/:id/status", authenticate, authorize(["superadmin"]), superadminController.updateMillStatus);
router.put("/superadmin/users/:userId/password", authenticate, authorize(["superadmin"]), superadminController.updateAdminPassword);

module.exports = router;
