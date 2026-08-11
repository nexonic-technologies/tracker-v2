import { useState, useEffect } from "react";
import useGenericAPI from "../../../components/useGenericAPI";
import PageLoader from "../../../components/Common/PageLoader";
import { Users, Shield, ArrowRight, User } from "lucide-react";
import toast from "react-hot-toast";

export default function OrgChart() {
  const { read } = useGenericAPI();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const res = await read("employees", {
          limit: 1000,
          filter: { status: "Active" },
          populateFields: {
            "professionalInfo.designation": "title",
            "professionalInfo.department": "name"
          }
        });
        setEmployees(res?.data || []);
      } catch (err) {
        console.error("Failed to load employees for org chart:", err);
        toast.error("Failed to load organizational structure");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Build tree structure
  const buildTree = () => {
    const map = {};
    employees.forEach(emp => {
      map[emp._id] = {
        ...emp,
        children: []
      };
    });

    const roots = [];
    employees.forEach(emp => {
      const parentId = emp.professionalInfo?.reportingManager;
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[emp._id]);
      } else {
        roots.push(map[emp._id]);
      }
    });

    return roots;
  };

  const TreeNode = ({ node }) => {
    const name = `${node.basicInfo?.firstName || ""} ${node.basicInfo?.lastName || ""}`.trim();
    const designation = node.professionalInfo?.designation?.title || "Staff Member";
    const department = node.professionalInfo?.department?.name || "General";

    return (
      <div className="flex flex-col items-center">
        {/* Node Box */}
        <div className="bg-surface border border-hairline hover:border-indigo-500 rounded-tracker-card p-4 shadow-sm min-w-[200px] text-center transition-all duration-200 hover:shadow-md">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2.5 font-bold text-[14px]">
            {node.basicInfo?.firstName?.[0] || <User className="h-5 w-5" />}
          </div>
          <h4 className="text-[13px] font-bold text-ink leading-snug">{name}</h4>
          <p className="text-[10px] text-indigo-500 font-semibold mt-1">{designation}</p>
          <p className="text-[9px] text-ink-tertiary mt-0.5">{department}</p>
        </div>

        {/* Children Connector Lines */}
        {node.children.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Vertical connector line */}
            <div className="w-0.5 h-6 bg-hairline" />
            
            {/* Horizontal connection bar */}
            <div className="flex gap-8 relative">
              {node.children.map((child, idx) => (
                <div key={child._id} className="relative flex flex-col items-center">
                  {/* Left & Right connecting elbows */}
                  <div className="absolute top-0 left-0 right-0 flex justify-between w-full">
                    <div className={`w-1/2 border-t-2 border-hairline ${idx === 0 ? "opacity-0" : ""}`} />
                    <div className={`w-1/2 border-t-2 border-hairline ${idx === node.children.length - 1 ? "opacity-0" : ""}`} />
                  </div>
                  {/* Node content recursive */}
                  <TreeNode node={child} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <PageLoader />;

  const treeRoots = buildTree();

  return (
    <div className="h-full flex flex-col gap-4 p-6 bg-canvas overflow-auto" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div>
        <p className="lmx-page-eyebrow mb-0.5">HRMS MODULE</p>
        <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-500" />
          Company Hierarchy Org Chart
        </h1>
      </div>

      <div className="flex-1 bg-surface border border-hairline rounded-tracker-card p-8 flex justify-center items-start overflow-auto">
        <div className="flex gap-12">
          {treeRoots.map(root => (
            <TreeNode key={root._id} node={root} />
          ))}
          {treeRoots.length === 0 && (
            <p className="text-center py-20 text-ink-subtle">No active employees found to display hierarchy.</p>
          )}
        </div>
      </div>
    </div>
  );
}
