import express from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateTaskCSV } from "../utils/exportService.js";
import { authMiddleware } from "../Controller/AuthController.js";
import { getModel } from "../utils/appRegistry.js";
import pdfService from "../utils/pdfService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * @route   GET /api/export/tasks
 * @desc    Export tasks to CSV
 * @access  Private
 */
router.get("/tasks", authMiddleware, async (req, res) => {
  try {
    const { status, priority, client } = req.query;

    // Build filter based on query params
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priorityLevel = priority;
    if (client) filter.clientId = new mongoose.Types.ObjectId(client);

    const csvData = await generateTaskCSV(filter);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"tasks_export.csv\"");

    return res.status(200).send(csvData);
  } catch (error) {
    console.error("Export Tasks Error:", error);
    res.status(500).json({ success: false, message: "Failed to export tasks" });
  }
});

/**
 * @route   GET /api/export/oa/:id
 * @desc    Export Order Acknowledgment to PDF
 * @access  Private
 */
router.get("/oa/:id", authMiddleware, async (req, res) => {
  try {
    const OA = req.tenantContext?.getModel
      ? (req.tenantContext.getModel("order_acknowledgements") || req.tenantContext.getModel("orderacknowledgments"))
      : (getModel("order_acknowledgements") || getModel("orderacknowledgments"));

    const oa = await OA
      .findById(req.params.id)
      .populate("clientId", "name email")
      .lean();

    if (!oa) {
      return res.status(404).json({ success: false, message: "Order Acknowledgment not found" });
    }

    const uploadsDir = path.resolve(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const tempFilePath = path.join(uploadsDir, `temp_${req.params.id}.pdf`);
    await pdfService.generateOA(oa, tempFilePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="OA_${oa.oaNumber}.pdf"`);

    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.pipe(res);
    fileStream.on("end", () => {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error("Failed to delete temp PDF file:", err);
      });
    });
  } catch (error) {
    console.error("Export OA PDF Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate OA PDF" });
  }
});

/**
 * @route   GET /api/export/payroll-submission
 * @desc    Export Authoritative Monthly Payroll Submission Register to XLSX (Excel)
 * @access  Private (Finance / HR / Admin)
 */
router.get("/payroll-submission", authMiddleware, async (req, res) => {
  try {
    const { month, year, departmentId } = req.query;
    const m = month || (new Date().getMonth() + 1);
    const y = year || new Date().getFullYear();

    const { default: payrollSubmissionService } = await import("../services/business/payrollSubmissionReport.js");
    const buffer = await payrollSubmissionService.generateXLSXBuffer({
      month: m,
      year: y,
      departmentId,
      user: req.user
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Monthly_Payroll_Submission_${m}_${y}.xlsx"`);

    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Export Payroll Submission XLSX Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to export payroll submission register" });
  }
});

/**
 * @route   GET /api/export/payroll-submission/json
 * @desc    Fetch Authoritative Monthly Payroll Submission Register JSON dataset with daily grid and audit trail
 * @access  Private
 */
router.get("/payroll-submission/json", authMiddleware, async (req, res) => {
  try {
    const { month, year, departmentId } = req.query;
    const m = month || (new Date().getMonth() + 1);
    const y = year || new Date().getFullYear();

    const { default: payrollSubmissionService } = await import("../services/business/payrollSubmissionReport.js");
    const reportData = await payrollSubmissionService.getMonthlySubmissionReport({
      month: m,
      year: y,
      departmentId,
      user: req.user
    });

    return res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error("Get Payroll Submission JSON Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to compile payroll submission dataset" });
  }
});

export default router;
