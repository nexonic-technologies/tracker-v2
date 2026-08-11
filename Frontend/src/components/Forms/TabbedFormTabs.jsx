/**
 * Profile-style tab bar — uses DESIGN.md tab-bar / tab-item tokens (theme + module aware).
 */
const TabbedFormTabs = ({ tabs, active, onChange }) => (
  <div className="lmx-tab-bar mb-6">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={`lmx-tab ${active === tab.id ? "lmx-tab-active" : ""}`}
      >
        {tab.icon}
        {tab.label}
      </button>
    ))}
  </div>
);

export default TabbedFormTabs;
