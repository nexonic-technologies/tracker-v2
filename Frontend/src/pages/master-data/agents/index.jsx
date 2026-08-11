import React, { useState, useEffect } from 'react';
import { Mail, Send } from 'lucide-react';
import AxiosInstance from '../../../api/axiosInstance';
import SearchBar from '../../../components/Common/SearchBar';

const AgentManagement = () => {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [inviteLoading, setInviteLoading] = useState({});

  const fetchAgents = async () => {
    try {
      const response = await AxiosInstance.get('/populate/read/agents?fields=client');
      const agentData = response.data?.data || [];
      setAgents(agentData);
      setFilteredAgents(agentData);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };


  const fetchClients = async () => {
    try {
      const response = await AxiosInstance.get('/populate/read/clients');
      setClients(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async (agentId) => {
    setInviteLoading(prev => ({ ...prev, [agentId]: true }));
    try {
      const response = await AxiosInstance.put(`/populate/update/agents/${agentId}`, {
        sendInvite: true
      });
      if (response.data.success) {
        alert('Invitation sent successfully!');
        fetchAgents(); // Refresh to update invite status
      }
    } catch (error) {
      alert('Failed to send invitation: ' + (error.response?.data?.message || error.message));
    } finally {
      setInviteLoading(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const createAgent = async (clientId, contactPerson) => {
    try {
      const payload = {
        name: contactPerson.name,
        email: contactPerson.email,
        phone: contactPerson.phone,
        client: clientId,
        role: 'agent',
        isActive: true
      };

      await AxiosInstance.post('/populate/create/agents', payload);
      fetchAgents();
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };



  useEffect(() => {
    fetchAgents();
    fetchClients();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Agent Management</h1>

      {/* Existing Agents */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Active Agents ({agents.length})</h2>
          <SearchBar
            data={agents}
            onFilter={setFilteredAgents}
            searchFields={['name', 'email', 'client.name']}
            placeholder="Search agents..."
          />
        </div>

        {filteredAgents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {agents.length === 0 ? "No agents created yet" : "No agents match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAgents.map((agent) => (
                  <tr key={agent._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {agent.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.client?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.lastLogin ? new Date(agent.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${agent.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!agent.hasSetPassword ? (
                        <button
                          onClick={() => sendInvite(agent._id)}
                          disabled={inviteLoading[agent._id]}
                          className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                        >
                          {inviteLoading[agent._id] ? (
                            'Sending...'
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              {agent.isInvited ? 'Resend Invite' : 'Send Invite'}
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-green-600 text-xs">✓ Password Set</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Agent from Clients */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Create Agent from Client</h2>
          <p className="text-sm text-gray-600">Select clients to create agent access for their contact persons</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients
              .filter(client => client.contactInfo && Array.isArray(client.contactInfo) && client.contactInfo.length > 0)
              .map((client) => (
                <div key={client._id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">{client.name}</h3>
                  <div className="space-y-3">
                    {client.contactInfo.map((contact, index) => {
                      const isAlreadyAgent = agents.some(agent => agent.email === contact.email);
                      return (
                        <div key={index} className="border-l-4 border-blue-200 pl-3">
                          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-600">Email: {contact.email || 'N/A'}</p>
                          <p className="text-sm text-gray-600">Phone: {contact.phone || 'N/A'}</p>
                          {contact.email && !isAlreadyAgent ? (
                            <button
                              onClick={() => createAgent(client._id, contact)}
                              className="mt-2 w-full bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600"
                            >
                              Create Agent Access
                            </button>
                          ) : (
                            <div className="mt-2 text-xs text-gray-500">
                              {!contact.email ? 'No email available' : 'Already an agent'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentManagement;