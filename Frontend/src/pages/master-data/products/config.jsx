import {
    productFormFields,
    productSubmitButton,
  } from "../../../constants/productForm";
  import { createModuleConfig } from "../createModuleConfig";
  
  export const productsConfig = createModuleConfig({
    folder: "Products",
    model: "products",
    title: "Products",
    subtitle: "Product management",
    singularName: "Product",
    fields: productFormFields,
    submitButton: productSubmitButton,
    list: {
      hiddenColumns: ["_id"],
      customRender: {
        Status: (row) => (
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              row.Status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {row.Status}
          </span>
        ),
      },
      cleanData: (item) => {
        const { ...rest } = item;
        return rest;
      },
    },
  });
  