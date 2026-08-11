export const SidebarForm = [
    {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        width: "half"
    },
    {
        name: "mainRoute",
        label: "Main Route",
        type: "text",
        required: true,
        width: "half"
    },
    {
        name: "icon.iconName",
        label: "Icon Name",
        type: "text",
        required: true,
        width: "half"
    },
    {
        name: "icon.iconPackage",
        label: "Icon Package",
        type: "text",
        required: true,
        width: "half"
    },
    {
        name: "parentId",
        label: "Parent Menu",
        type: "AutoComplete",
        source: "populate/read/sidebars?filter=isParent:true",
        labelField: "title",
        fieldName: "title",
        valueField: "_id",
        required: false,
        width: "half"
    },
    {
        name: "order",
        label: "Order",
        type: "number",
        required: true,
        width: "half"
    },
    {
        name: "isActive",
        label: "Active?",
        type: "select",
        options: [
            { name: "Yes", _id: true },
            { name: "No", _id: false }
        ],
        default: true,
        width: "half"
    }
];