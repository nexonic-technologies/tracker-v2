import React, { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

// ColumnVisibility component (unchanged)
function ColumnVisibility({ columns, selectedCols, toggleColumn }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Column Visibility
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-2 w-56 bg-white border rounded-md shadow-lg p-3 max-h-64 overflow-auto"
        >
          {columns.map((col) => (
            <label
              key={col}
              className="flex items-center justify-between p-2 rounded hover:bg-blue-50 cursor-pointer"
            >
              <span
                className={`text-gray-700 ${
                  selectedCols.includes(col) ? "font-semibold" : "text-gray-400"
                }`}
              >
                {col}
              </span>
              <input
                type="checkbox"
                checked={selectedCols.includes(col)}
                onChange={() => toggleColumn(col)}
                className="accent-blue-500"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExcelColumnExtractor() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedCols, setSelectedCols] = useState([]);
  const [page, setPage] = useState(1);
  const [searchCol, setSearchCol] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const rowsPerPage = 20;

  // Handles Excel or JSON uploads
  const handleUpload = (e) => {
    const files = e.target.files;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const fileType = file.name.split(".").pop().toLowerCase();

      reader.onload = (evt) => {
        if (fileType === "xlsx" || fileType === "xls") {
          // Handle Excel
          const wb = XLSX.read(evt.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          if (rows.length < 2) return;

          const headers = rows[1]; // second row as header
          const dataRows = rows.slice(2);
          const json = dataRows.map((row) => {
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = row[i] ?? "";
            });
            return obj;
          });

          mergeData(json, headers);
        } else if (fileType === "json") {
          // Handle JSON
          try {
            const json = JSON.parse(evt.target.result);
            if (!Array.isArray(json) || json.length === 0) return;

            const headers = Object.keys(json[0]);
            mergeData(json, headers);
          } catch (error) {
            alert(`Invalid JSON file: ${file.name}, ${error}`);
          }
        } else {
          alert("Unsupported file type. Please upload Excel or JSON.");
        }
      };

      if (fileType === "xlsx" || fileType === "xls")
        reader.readAsBinaryString(file);
      else reader.readAsText(file);
    });
  };

  // Merge multiple uploads (Excel/JSON)
  const mergeData = (newData, newHeaders) => {
    setColumns((prevCols) => {
      const mergedCols = Array.from(new Set([...prevCols, ...newHeaders]));
      return mergedCols;
    });

    setSelectedCols((prevSel) => {
      const merged = Array.from(new Set([...prevSel, ...newHeaders]));
      return merged;
    });

    setData((prevData) => [...prevData, ...newData]);
  };

  // Toggle column visibility
  const toggleColumn = (col) => {
    if (selectedCols.includes(col)) {
      setSelectedCols(selectedCols.filter((c) => c !== col));
      if (searchCol === col) setSearchCol("");
    } else {
      const newSelected = [...selectedCols, col];
      const ordered = columns.filter((c) => newSelected.includes(c));
      setSelectedCols(ordered);
    }
  };

  // Export filtered data
  const exportExcel = () => {
    const filtered = data.map((row) => {
      const obj = {};
      selectedCols.forEach((c) => (obj[c] = row[c]));
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Filtered");
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "filtered.xlsx"
    );
  };

  // Filtered + paginated data
  const filteredData = useMemo(() => {
    if (!searchCol || !searchTerm) return data;
    return data.filter((row) =>
      String(row[searchCol] || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [data, searchCol, searchTerm]);

  const paginatedData = filteredData.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Autocomplete suggestions
  const valueSuggestions = useMemo(() => {
    if (!searchCol) return [];
    const values = new Set(data.map((row) => String(row[searchCol] || "")));
    return Array.from(values);
  }, [data, searchCol]);

  useEffect(() => setPage(1), [searchTerm, searchCol, selectedCols]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Excel / JSON Column Extractor</h1>

      {/* File Upload */}
      <input
        type="file"
        multiple
        accept=".xlsx, .xls, .json"
        onChange={handleUpload}
        className="mb-4"
      />

      {/* Column Visibility */}
      {columns.length > 0 && (
        <ColumnVisibility
          columns={columns}
          selectedCols={selectedCols}
          toggleColumn={toggleColumn}
        />
      )}

      {/* Search */}
      {columns.length > 0 && (
        <div className="mb-6 flex space-x-4">
          <div className="w-48">
            <label className="block text-sm font-medium mb-1">
              Search Column
            </label>
            <Autocomplete
              options={columns}
              value={searchCol}
              onChange={(e, val) => setSearchCol(val || "")}
              renderInput={(params) => (
                <TextField {...params} label="Select column..." size="small" />
              )}
            />
          </div>

          <div className="w-64">
            <label className="block text-sm font-medium mb-1">Keyword</label>
            <Autocomplete
              options={valueSuggestions}
              value={searchTerm}
              onChange={(e, val) => setSearchTerm(val || "")}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Type or select keyword..."
                  size="small"
                />
              )}
              freeSolo
            />
          </div>
        </div>
      )}

      {/* Table */}
      {filteredData.length > 0 && (
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-blue-400 text-white">
              <tr>
                {columns.map(
                  (col) =>
                    selectedCols.includes(col) && (
                      <th
                        key={col}
                        className="px-4 py-2 border text-left text-sm font-medium w-40"
                      >
                        {col}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 even:bg-gray-50">
                  {columns.map(
                    (col) =>
                      selectedCols.includes(col) && (
                        <td
                          key={col}
                          className="px-4 py-2 border text-sm text-black w-40 break-words"
                        >
                          {row[col] || ""}
                        </td>
                      )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredData.length > rowsPerPage && (
        <div className="mt-4 flex justify-center space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {page} of {Math.ceil(filteredData.length / rowsPerPage)}
          </span>
          <button
            onClick={() => setPage(Math.min(Math.ceil(filteredData.length / rowsPerPage), page + 1))}
            disabled={page === Math.ceil(filteredData.length / rowsPerPage)}
            className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Export */}
      {data.length > 0 && (
        <button
          onClick={exportExcel}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Export Filtered Data
        </button>
      )}
    </div>
  );
}