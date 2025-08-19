"use client";

import { useState } from "react";

interface Project {
  id: number;
  project_name: string;
  location: string;
  project_type: string;
  stage: string;
  stakeholders: string;
  project_value: string;
  date_added: string;
  source_link: string;
}

interface ExportButtonProps {
  data: Project[];
  filename?: string;
}

// Helper function to determine source type based on URL
const getSourceType = (sourceLink: string) => {
  if (!sourceLink) return "Not specified";
  if (sourceLink.endsWith(".pdf")) return "PDF";
  if (sourceLink.startsWith("https://www.tdlr.texas.gov/TABS/")) return "Texas";
  return "Website";
};

export default function ExportButton({
  data,
  filename = "projects",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const convertToCSV = (data: Project[]) => {
    const headers = [
      "ID",
      "Project Name",
      "Location",
      "Project Type",
      "Stage",
      "Stakeholders",
      "Project Value",
      "Source Link",
      "Date Added",
    ];

    const csvContent = [
      headers.join(","),
      ...data.map((project) =>
        [
          project.id,
          `"${(project.project_name || "Not specified").replace(/"/g, '""')}"`,
          `"${(project.location || "Not specified").replace(/"/g, '""')}"`,
          `"${(project.project_type || "Not specified").replace(/"/g, '""')}"`,
          `"${(project.stage || "Not specified").replace(/"/g, '""')}"`,
          `"${(project.stakeholders || "Not specified").replace(/"/g, '""')}"`,
          `"${(project.project_value || "Not specified").replace(/"/g, '""')}"`,
          `"${(project.source_link || "Not specified").replace(/"/g, '""')}"`,
          (() => {
            if (!project.date_added || project.date_added.trim() === "") {
              return "Not specified";
            }
            const date = new Date(project.date_added);
            if (isNaN(date.getTime())) {
              return "Not specified";
            }
            return date.toLocaleDateString();
          })(),
        ].join(","),
      ),
    ].join("\n");

    return csvContent;
  };

  const downloadFile = (
    content: string,
    fileName: string,
    mimeType: string,
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const csvContent = convertToCSV(data);
      const timestamp = new Date().toISOString().split("T")[0];
      downloadFile(csvContent, `${filename}_${timestamp}.csv`, "text/csv");
    } catch (error) {
      console.error("Error exporting CSV:", error);
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const timestamp = new Date().toISOString().split("T")[0];
      downloadFile(
        jsonContent,
        `${filename}_${timestamp}.json`,
        "application/json",
      );
    } catch (error) {
      console.error("Error exporting JSON:", error);
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  const exportToPrintableHTML = async () => {
    setIsExporting(true);
    try {
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Data Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        tr:nth-child(even) { background-color: #f8f9fa; }
        .stage-approved { background-color: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; }
        .stage-proposed { background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; }
        .stage-default { background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; }
        .source-link { color: #3b82f6; text-decoration: none; }
        .report-info { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="report-info">
        <h1>Project Data Report</h1>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Projects:</strong> ${data.length}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Project Name</th>
                <th>Location</th>
                <th>Type</th>
                <th>Stage</th>
                <th>Stakeholders</th>
                <th>Project Value</th>
                <th>Source Link</th>
                <th>Date Added</th>
            </tr>
        </thead>
        <tbody>
            ${data
              .map(
                (project) => `
                <tr>
                    <td>${project.id}</td>
                    <td>${project.project_name || "Not specified"}</td>
                    <td>${project.location || "Not specified"}</td>
                    <td>${project.project_type || "Not specified"}</td>
                    <td>
                        <span class="${
                          (project.stage || "")
                            .toLowerCase()
                            .includes("approved")
                            ? "stage-approved"
                            : (project.stage || "")
                                  .toLowerCase()
                                  .includes("proposed")
                              ? "stage-proposed"
                              : "stage-default"
                        }">
                            ${project.stage || "Not specified"}
                        </span>
                    </td>
                    <td>${project.stakeholders || "Not specified"}</td>
                    <td>${project.project_value || "Not specified"}</td>
                    <td>
                        ${
                          project.source_link
                            ? `<a href="${project.source_link}" class="source-link" target="_blank">${getSourceType(project.source_link)}</a>`
                            : "Not specified"
                        }
                    </td>
                    <td>${(() => {
                      if (
                        !project.date_added ||
                        project.date_added.trim() === ""
                      ) {
                        return "Not specified";
                      }
                      const date = new Date(project.date_added);
                      if (isNaN(date.getTime())) {
                        return "Not specified";
                      }
                      return date.toLocaleDateString();
                    })()}</td>
                </tr>
            `,
              )
              .join("")}
        </tbody>
    </table>
</body>
</html>`;

      const timestamp = new Date().toISOString().split("T")[0];
      downloadFile(
        htmlContent,
        `${filename}_report_${timestamp}.html`,
        "text/html",
      );
    } catch (error) {
      console.error("Error exporting HTML:", error);
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isExporting ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export ({data.length})
            <svg
              className="ml-2 -mr-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1" role="menu">
            <button
              onClick={exportToCSV}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
              role="menuitem"
            >
              <svg
                className="mr-3 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export as CSV
            </button>
            <button
              onClick={exportToJSON}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
              role="menuitem"
            >
              <svg
                className="mr-3 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              Export as JSON
            </button>
            <button
              onClick={exportToPrintableHTML}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
              role="menuitem"
            >
              <svg
                className="mr-3 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H9.5a2 2 0 01-2-2V5a2 2 0 012-2H14l2 2v6a2 2 0 002 2z"
                />
              </svg>
              Export as Report
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
