import React, { useState, useEffect } from 'react';
import axiosInstance from '@api/axiosInstance';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    CheckIcon
} from '@heroicons/react/24/solid';

const Capabilities = () => {
    const [capabilities, setCapabilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCap, setEditingCap] = useState(null);
    const [message, setMessage] = useState('');

    const [formData, setFormData] = useState({
        key: '',
        module: '',
        label: '',
        description: '',
        type: 'ui',
        action: 'view',
        resourceKey: '',
        status: 'active'
    });

    // Fetch capabilities
    useEffect(() => {
        fetchCapabilities();
    }, []);

    const fetchCapabilities = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.post('/populate/read/capabilities', { limit: 1000 });
            setCapabilities(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch capabilities', err);
            setMessage('Error loading capabilities');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (cap = null) => {
        if (cap) {
            setEditingCap(cap);
            setFormData({
                key: cap.key || '',
                module: cap.module || '',
                label: cap.label || '',
                description: cap.description || '',
                type: cap.type || 'ui',
                action: cap.action || 'view',
                resourceKey: cap.resourceKey || '',
                status: cap.status || 'active'
            });
        } else {
            setEditingCap(null);
            setFormData({
                key: '',
                module: '',
                label: '',
                description: '',
                type: 'ui',
                action: 'view',
                resourceKey: '',
                status: 'active'
            });
        }
        setShowModal(true);
        setMessage('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCap(null);
        setFormData({
            key: '',
            module: '',
            label: '',
            description: '',
            type: 'ui',
            action: 'view',
            resourceKey: '',
            status: 'active'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Saving...');

        const submitData = {
            ...formData
        };

        try {
            if (editingCap) {
                await axiosInstance.put(`/populate/update/capabilities/${editingCap._id}`, submitData);
                setMessage('Capability updated successfully!');
            } else {
                await axiosInstance.post('/populate/create/capabilities', submitData);
                setMessage('Capability created successfully!');
            }
            await fetchCapabilities();
            handleCloseModal();
        } catch (err) {
            console.error('Failed to save capability', err);
            setMessage('Error saving capability');
        }
    };

    const handleDelete = async (capId) => {
        if (!confirm('Are you sure you want to delete this capability?')) return;

        try {
            await axiosInstance.delete(`/populate/delete/capabilities/${capId}`);
            setMessage('Capability deleted successfully!');
            await fetchCapabilities();
        } catch (err) {
            console.error('Failed to delete capability', err);
            setMessage('Error deleting capability');
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold dark:text-white">Capabilities Management</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Capability
                </button>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded ${
                    message.includes('Error') 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>
                    {message}
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 dark:text-gray-300">Loading...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Key</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Label</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Module</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {capabilities.map((cap) => (
                                <tr key={cap._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {cap.key}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {cap.label}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {cap.module}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            cap.type === 'ui' 
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                        }`}>
                                            {cap.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {cap.action || '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            cap.status === 'active' 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                        }`}>
                                            {cap.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenModal(cap)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                                        >
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cap._id?.$oid || cap._id)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold dark:text-white">
                                    {editingCap ? 'Edit Capability' : 'Add New Capability'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Key *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.key}
                                            onChange={(e) => setFormData({...formData, key: e.target.value})}
                                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="e.g., dashboard:view"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Module *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.module}
                                            onChange={(e) => setFormData({...formData, module: e.target.value})}
                                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="e.g., dashboard"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Label *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.label}
                                        onChange={(e) => setFormData({...formData, label: e.target.value})}
                                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="e.g., View Dashboard"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        rows="2"
                                        placeholder="Capability description"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Type *
                                        </label>
                                        <select
                                            required
                                            value={formData.type}
                                            onChange={(e) => setFormData({...formData, type: e.target.value})}
                                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="ui">UI (Sidebar)</option>
                                            <option value="business">Business (User Action)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Action *
                                        </label>
                                        <input
                                            type="text"
                                            list="action-suggestions"
                                            required
                                            value={formData.action}
                                            onChange={(e) => setFormData({...formData, action: e.target.value})}
                                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="e.g., view"
                                        />
                                        <datalist id="action-suggestions">
                                            <option value="menu" />
                                            <option value="view" />
                                            <option value="read" />
                                            <option value="create" />
                                            <option value="update" />
                                            <option value="delete" />
                                        </datalist>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Resource Key
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.resourceKey}
                                        onChange={(e) => setFormData({...formData, resourceKey: e.target.value})}
                                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="e.g., employee"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Status *
                                    </label>
                                    <select
                                        required
                                        value={formData.status}
                                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="active">Active</option>
                                        <option value="deprecated">Deprecated</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <CheckIcon className="w-4 h-4" />
                                        {editingCap ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Capabilities;
