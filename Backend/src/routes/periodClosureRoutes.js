// src/routes/periodClosureRoutes.js
import express from 'express';
import { authMiddleware } from '../Controller/AuthController.js';
import period_closuresService from '../services/period_closures.js';

const router = express.Router();
const service = period_closuresService();

/**
 * Middleware to check finance/admin access
 */
const requireFinanceAccess = (req, res, next) => {
  const role = req.user?.role;
  const allowedRoles = ['Super Admin', 'Admin', 'Finance Manager', 'HR Manager'];

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Finance/HR access required for period closure operations'
    });
  }
  next();
};

/**
 * GET /api/period-closures
 * List all period closures with optional filters
 */
router.get('/', authMiddleware, requireFinanceAccess, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      financialYearLabel: req.query.financialYearLabel,
      module: req.query.module,
      moduleClosed: req.query.moduleClosed === 'true'
    };

    const closures = await service.list(filters);

    res.json({
      success: true,
      data: closures,
      count: closures.length
    });
  } catch (error) {
    console.error('[period-closures] GET error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch period closures'
    });
  }
});

/**
 * GET /api/period-closures/:id
 * Get a specific period closure by ID with populated fields
 */
router.get('/:id', authMiddleware, requireFinanceAccess, async (req, res) => {
  try {
    const closure = await service.getById(req.params.id);

    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Period closure not found'
      });
    }

    res.json({
      success: true,
      data: closure
    });
  } catch (error) {
    console.error('[period-closures] GET by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch period closure'
    });
  }
});

/**
 * POST /api/period-closures
 * Create a new period closure
 */
router.post('/', authMiddleware, requireFinanceAccess, async (req, res) => {
  try {
    const ctx = {
      body: req.body,
      user: req.user
    };

    await service.beforeCreate(ctx);

    const { default: models } = await import('../models/Collection.js');
    const closure = await models.period_closures.create(ctx.body);

    const populatedClosure = await service.getById(closure._id);

    res.status(201).json({
      success: true,
      data: populatedClosure,
      message: 'Period closure created successfully'
    });
  } catch (error) {
    console.error('[period-closures] POST error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create period closure'
    });
  }
});

/**
 * PUT /api/period-closures/:id
 * Update a period closure (close/reopen modules or entire period)
 */
router.put('/:id', authMiddleware, requireFinanceAccess, async (req, res) => {
  try {
    const { default: models } = await import('../models/Collection.js');
    const existingDoc = await models.period_closures.findById(req.params.id);

    if (!existingDoc) {
      return res.status(404).json({
        success: false,
        message: 'Period closure not found'
      });
    }

    const ctx = {
      body: req.body,
      user: req.user,
      existingDoc
    };

    await service.beforeUpdate(ctx);

    const updatedClosure = await models.period_closures.findByIdAndUpdate(
      req.params.id,
      ctx.body,
      { new: true }
    );

    const populatedClosure = await service.getById(updatedClosure._id);

    res.json({
      success: true,
      data: populatedClosure,
      message: 'Period closure updated successfully'
    });
  } catch (error) {
    console.error('[period-closures] PUT error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update period closure'
    });
  }
});

/**
 * DELETE /api/period-closures/:id
 * Delete a period closure (only if status is Open)
 */
router.delete('/:id', authMiddleware, requireFinanceAccess, async (req, res) => {
  try {
    const { default: models } = await import('../models/Collection.js');
    const closure = await models.period_closures.findById(req.params.id);

    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Period closure not found'
      });
    }

    if (closure.status !== 'Open') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete period closures with Open status'
      });
    }

    await models.period_closures.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Period closure deleted successfully'
    });
  } catch (error) {
    console.error('[period-closures] DELETE error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete period closure'
    });
  }
});

/**
 * GET /api/period-closures/check/:date/:module
 * Check if a specific date is closed for a given module
 * Public endpoint (no auth required) for service-level checks
 */
router.get('/check/:date/:module', async (req, res) => {
  try {
    const { date, module } = req.params;
    const validModules = ['payroll', 'attendance', 'expenses', 'timeTracking', 'quotations'];

    if (!validModules.includes(module)) {
      return res.status(400).json({
        success: false,
        message: `Invalid module. Must be one of: ${validModules.join(', ')}`
      });
    }

    const isClosed = await service.isPeriodClosed(date, module);

    res.json({
      success: true,
      data: {
        date,
        module,
        isClosed
      }
    });
  } catch (error) {
    console.error('[period-closures] check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check period closure status'
    });
  }
});

/**
 * GET /api/period-closures/active/:date
 * Get the active period closure for a given date
 */
router.get('/active/:date', authMiddleware, requireFinanceAccess, async (req, res) => {
  try {
    const closure = await service.getActiveClosure(req.params.date);

    res.json({
      success: true,
      data: closure
    });
  } catch (error) {
    console.error('[period-closures] active error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch active period closure'
    });
  }
});

/**
 * POST /api/period-closures/:id/close-module/:moduleName
 * Close a specific module within a period closure
 */
router.post('/:id/close-module/:moduleName', authMiddleware, requireFinanceAccess, async (req, res) => {
  try {
    const { id, moduleName } = req.params;
    const validModules = ['payroll', 'attendance', 'expenses', 'timeTracking', 'quotations'];

    if (!validModules.includes(moduleName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid module. Must be one of: ${validModules.join(', ')}`
      });
    }

    const { default: models } = await import('../models/Collection.js');
    const existingDoc = await models.period_closures.findById(id);

    if (!existingDoc) {
      return res.status(404).json({
        success: false,
        message: 'Period closure not found'
      });
    }

    const updateData = {
      modules: {
        ...existingDoc.modules,
        [moduleName]: {
          closed: true,
          remarks: req.body.remarks || ''
        }
      }
    };

    const ctx = {
      body: updateData,
      user: req.user,
      existingDoc
    };

    await service.beforeUpdate(ctx);

    const updatedClosure = await models.period_closures.findByIdAndUpdate(
      id,
      ctx.body,
      { new: true }
    );

    const populatedClosure = await service.getById(updatedClosure._id);

    res.json({
      success: true,
      data: populatedClosure,
      message: `${moduleName} module closed successfully`
    });
  } catch (error) {
    console.error('[period-closures] close-module error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to close module'
    });
  }
});

export default router;
