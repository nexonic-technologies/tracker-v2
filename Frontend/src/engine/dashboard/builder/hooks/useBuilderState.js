/**
 * Dashboard Engine — useBuilderState Hook
 *
 * Manages dashboard builder state: active schema, selected widget, adding/updating/deleting widgets.
 */
import { useState, useCallback, useEffect } from 'react';
import { getFixtureForRole } from '../../fixtures/fixtureLoader';
import axiosInstance from '../../../../api/axiosInstance';
import { nanoid } from 'nanoid';

export function useBuilderState(initialRole = 'admin') {
  const [role, setRole] = useState(initialRole);
  const [schema, setSchema] = useState(() => getFixtureForRole(initialRole));
  const [selectedWidgetId, setSelectedWidgetId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load role schema (backend first, fallback to static fixture)
  const loadRoleSchema = useCallback(async (targetRole) => {
    setLoading(true);
    try {
      const normalized = (targetRole || '').toLowerCase().trim();
      const res = await axiosInstance.post('/populate/read/dashboard_schemas', {
        filter: { role: normalized },
        limit: 1,
      });
      const doc = res.data?.data?.[0];
      if (doc && doc.widgets && doc.widgets.length > 0) {
        setSchema(doc);
        setLoading(false);
        return;
      }
    } catch (err) {
      // 404 or network warning falls back smoothly to fixture
    }
    setSchema(getFixtureForRole(targetRole));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRoleSchema(role);
  }, [role, loadRoleSchema]);

  // Switch role template
  const handleRoleChange = useCallback((newRole) => {
    setRole(newRole);
    setSelectedWidgetId(null);
  }, []);

  // Add a new widget from library
  const addWidget = useCallback((type, manifest) => {
    const widgetId = `w-${type}-${nanoid(5)}`;

    setSchema((prev) => {
      const existingWidgets = prev?.widgets || [];

      // Find highest bottom row (y + h) of existing widgets
      const nextY = existingWidgets.reduce((max, w) => {
        const bottom = (w.layout?.y || 0) + (w.layout?.h || 2);
        return Math.max(max, bottom);
      }, 0);

      const newWidget = {
        id: widgetId,
        type,
        title: manifest.name,
        layout: {
          x: 0,
          y: nextY,
          w: manifest.sizeConstraints?.defaultW || 3,
          h: manifest.sizeConstraints?.defaultH || 2,
        },
        config: { ...manifest.defaultConfig },
        data: { status: 'ready', payload: {} },
        actions: [],
      };

      return {
        ...prev,
        widgets: [...existingWidgets, newWidget],
      };
    });

    setSelectedWidgetId(widgetId);
  }, []);

  // Update a widget descriptor
  const updateWidget = useCallback((updatedWidget) => {
    setSchema((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === updatedWidget.id ? updatedWidget : w)),
    }));
  }, []);

  // Delete a widget
  const deleteWidget = useCallback((widgetId) => {
    setSchema((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
    }));

    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
  }, [selectedWidgetId]);

  const selectedWidget = schema.widgets?.find((w) => w.id === selectedWidgetId) || null;

  return {
    role,
    schema,
    selectedWidgetId,
    selectedWidget,
    setRole: handleRoleChange,
    setSelectedWidgetId,
    addWidget,
    updateWidget,
    deleteWidget,
    setSchema,
  };
}
