import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../../api/axiosInstance";
import MasterDataFormView from "../../../components/MasterData/MasterDataFormView";
import { buildEmployeeFormFields } from "../../../constants/employeeForm";
import { employeesConfig } from "./config";

const EmployeeFormPage = () => {
  const [deps, setDeps] = useState({
    designations: [],
    departments: [],
    roles: [],
    employees: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const [deptRes, desigRes, roleRes, empRes] = await Promise.all([
          axiosInstance.post("/populate/read/departments", { limit: 1000 }),
          axiosInstance.post("/populate/read/designations", { limit: 1000 }),
          axiosInstance.post("/populate/read/roles", { limit: 1000 }),
          axiosInstance.post("/populate/read/employees", { limit: 1000 }),
        ]);
        setDeps({
          departments: deptRes.data?.data || [],
          designations: desigRes.data?.data || [],
          roles: roleRes.data?.data || [],
          employees: empRes.data?.data || [],
        });
      } catch (e) {
        console.error("Failed to load employee form options", e);
      }
    })();
  }, []);

  const fields = useMemo(() => buildEmployeeFormFields(deps), [deps]);

  return <MasterDataFormView config={employeesConfig} fields={fields} />;
};

export default EmployeeFormPage;
