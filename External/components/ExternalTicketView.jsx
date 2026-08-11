import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
const ExternalTicketView = () => {
    const { ticketId } = useParams();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusColors, setStatusColors] = useState({});
    useEffect(() => {
        fetchTicket();
    }, [ticketId]);
    const fetchTicket = async () => {
        try {
            const [ticketRes, configRes] = await Promise.all([
                axiosInstance.get(`/populate/read/tickets/${ticketId}`),
                axiosInstance.post(`/populate/read/status_configss`, { filter: { modelName: 'tickets' } })
            ]);
            setTicket(ticketRes.data.data);

            if (configRes.data.data && configRes.data.data.length > 0) {
                const config = configRes.data.data[0];
                const colorsMap = {};
                if (config.metaStatuses) {
                    config.metaStatuses.forEach(s => colorsMap[s.label] = s.color);
                }
                if (config.workflowStatuses) {
                    config.workflowStatuses.forEach(s => colorsMap[s.label] = s.color);
                }
                setStatusColors(colorsMap);
            }
        } catch (error) {
            console.error('Error fetching ticket data:', error);
        } finally {
            setLoading(false);
        }
    };
    const getStatusStyle = (status) => {
        const hexColor = statusColors[status];
        if (hexColor) {
            // Convert hex to Tailwind-like styles manually via inline style, but return classes for fallback
            return {
                style: { backgroundColor: `${hexColor}20`, color: hexColor, borderColor: `${hexColor}40` },
                className: 'bg-gray-50 border'
            };
        }

        const colors = {
            'Open': 'bg-blue-50 text-blue-700 border-blue-200',
            'In Progress': 'bg-orange-50 text-orange-700 border-orange-200',
            'Review': 'bg-purple-50 text-purple-700 border-purple-200',
            'Testing': 'bg-cyan-50 text-cyan-700 border-cyan-200',
            'Completed': 'bg-green-50 text-green-700 border-green-200',
            'Closed': 'bg-gray-50 text-gray-700 border-gray-200'
        };
        return { style: {}, className: colors[status] || 'bg-gray-50 text-gray-700 border-gray-200' };
    };
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading ticket...</div>
            </div>
        );
    }
    if (!ticket) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-red-600">Ticket not found</div>
            </div>
        );
    }
    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
                        <p className="text-sm text-gray-500 mt-1">Ticket #{ticket.ticketId}</p>
                    </div>
                    {(() => {
                        const styleInfo = getStatusStyle(ticket.status);
                        return (
                            <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styleInfo.className}`}
                                style={styleInfo.style}
                            >
                                {ticket.status}
                            </span>
                        );
                    })()}
                </div>
            </div>
            {/* Description - Only User Story is visible to external clients */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                        {ticket.userStory || 'No description available'}
                    </p>
                </div>
            </div>
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Information</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Created Date</label>
                        <p className="text-gray-900">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                        <p className="text-gray-900">{new Date(ticket.updatedAt).toLocaleDateString()}</p>
                    </div>
                    {ticket.accountManager && (
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Account Manager</label>
                            <p className="text-gray-900">
                                {ticket.accountManager.basicInfo?.firstName} {ticket.accountManager.basicInfo?.lastName}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {/* Status Updates */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Updates</h2>
                <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Ticket Created</p>
                            <p className="text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    {ticket.updatedAt !== ticket.createdAt && (
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Status Updated</p>
                                <p className="text-xs text-gray-500">{new Date(ticket.updatedAt).toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default ExternalTicketView;