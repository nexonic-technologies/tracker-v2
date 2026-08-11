import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const getSearchableText = (val) => {
  if (val == null) return "";
  if (Array.isArray(val)) {
    return val.map(getSearchableText).join(" ");
  }
  if (typeof val === "object") {
    if (val.basicInfo) {
      const { firstName = "", lastName = "" } = val.basicInfo;
      return `${firstName} ${lastName}`.trim();
    }
    if (val.firstName !== undefined || val.lastName !== undefined) {
      return `${val.firstName || ""} ${val.lastName || ""}`.trim();
    }
    const parts = [];
    if (val.title) parts.push(val.title);
    if (val.name) parts.push(val.name);
    if (parts.length > 0) return parts.join(" ");
    return Object.values(val).map(getSearchableText).join(" ");
  }
  return String(val);
};

const SearchBar = ({ data, onFilter, searchFields, placeholder = "Search..." }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (value) => {
    setSearchTerm(value);
    
    if (!value.trim()) {
      onFilter(data);
      return;
    }

    const q = value.toLowerCase();
    const filtered = data.filter(item => {
      return searchFields.some(field => {
        const fieldValue = getNestedValue(item, field);
        const searchableText = getSearchableText(fieldValue).toLowerCase();
        return searchableText.includes(q);
      });
    });
    
    onFilter(filtered);
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onFilter(data);
  };

  return (
    <div className="relative w-64">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-ink-subtle" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="block w-full pl-10 pr-10 py-2 border border-hairline rounded-[8px] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] text-[13px] text-ink placeholder:text-ink-subtle bg-surface outline-none transition-colors"
      />
      {searchTerm && (
        <button
          onClick={clearSearch}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <X className="h-4 w-4 text-ink-subtle hover:text-ink transition-colors" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;