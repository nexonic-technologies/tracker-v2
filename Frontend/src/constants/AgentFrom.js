export const agentFromFields = [
    {
        label: "Agent Name",
        name: "name",
        type: "text",
        required: true,
        orderKey: 1,
    },
    {
        label: "Agent Email",
        name: "email",
        type: "email",
        required: true,
        orderKey: 2,
    },
    {
        label: "Client",
        name: "client",
        type: "AutoComplete",
        source: "/populate/read/clients",
        required: true,
        orderKey: 3,
    }
];

export const agentSubmitButton = {
    text: "Create Agent",
    color: "blue",
};