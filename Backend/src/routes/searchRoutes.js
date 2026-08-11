import express from 'express';
import { buildQuery } from '../utils/policy/policyEngine.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const queryStr = String(q).trim();

    if (!queryStr) {
      return res.json({
        success: true,
        data: {
          tickets: [],
          tasks: []
        }
      });
    }

    // Build the query filters
    const ticketFilter = {
      $or: [
        { title: { $regex: queryStr, $options: 'i' } },
        { ticketId: { $regex: queryStr, $options: 'i' } }
      ]
    };

    const taskFilter = {
      $or: [
        { title: { $regex: queryStr, $options: 'i' } },
        { userStory: { $regex: queryStr, $options: 'i' } }
      ]
    };

    // Execute queries using policyEngine's buildQuery to enforce dynamic access policies
    const [tickets, tasks] = await Promise.all([
      buildQuery({
        role: req.user.role,
        userId: req.user.id,
        action: 'read',
        modelName: 'tickets',
        filter: ticketFilter,
        limit: 50
      }).catch(err => {
        console.error('Search tickets query failed:', err.message);
        return [];
      }),
      buildQuery({
        role: req.user.role,
        userId: req.user.id,
        action: 'read',
        modelName: 'tasks',
        filter: taskFilter,
        limit: 50
      }).catch(err => {
        console.error('Search tasks query failed:', err.message);
        return [];
      })
    ]);

    return res.json({
      success: true,
      data: {
        tickets: tickets || [],
        tasks: tasks || []
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
