"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import LoadingSkeleton from "./components/LoadingSkeleton";
import ExportButton from "./components/ExportButton";
import TableToolbar from "./components/TableToolbar";

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

type SortField = keyof Project;
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function Home() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("date_added");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [filterStage, setFilterStage] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to determine source type based on URL
  const getSourceType = (sourceLink: string) => {
    if (!sourceLink) return "Not specified";
    if (sourceLink.endsWith(".pdf")) return "PDF";
    if (sourceLink.startsWith("https://www.tdlr.texas.gov/TABS/")) return "Texas";
    return "Website";
  };

  const fetchProjects = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchProjects();
    }
  }, [isSignedIn]);

  const handleRefresh = () => {
    fetchProjects(true);
  };

  // Get unique values for filters
  const uniqueStages = useMemo(() => {
    return Array.from(
      new Set(projects.map((p) => p.stage || "Not specified")),
    ).sort();
  }, [projects]);

  const uniqueTypes = useMemo(() => {
    return Array.from(
      new Set(projects.map((p) => p.project_type || "Not specified")),
    ).sort();
  }, [projects]);

  const uniqueSourceTypes = useMemo(() => {
    return Array.from(
      new Set(projects.map((p) => getSourceType(p.source_link))),
    ).sort();
  }, [projects]);

  // Filter and sort data
  const filteredAndSortedProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      const searchableValues = Object.values(project).map(
        (value) => value || "Not specified",
      );
      const matchesSearch = searchableValues
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const projectStage = project.stage || "Not specified";
      const projectType = project.project_type || "Not specified";
      const projectSourceType = getSourceType(project.source_link);

      const matchesStage = !filterStage || projectStage === filterStage;
      const matchesType = !filterType || projectType === filterType;
      const matchesSource = !filterSource || projectSourceType === filterSource;

      return matchesSearch && matchesStage && matchesType && matchesSource;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle date sorting
      if (sortField === "date_added") {
        // Handle "Not specified" values and empty strings - put them at the end
        const aIsNotSpecified =
          !aVal ||
          aVal === "Not specified" ||
          aVal.toString().trim() === "" ||
          aVal === null ||
          aVal === undefined;
        const bIsNotSpecified =
          !bVal ||
          bVal === "Not specified" ||
          bVal.toString().trim() === "" ||
          bVal === null ||
          bVal === undefined;

        if (aIsNotSpecified && bIsNotSpecified) return 0;
        if (aIsNotSpecified) return 1; // Put "Not specified" at end
        if (bIsNotSpecified) return -1; // Put "Not specified" at end

        const aDate = new Date(aVal as string);
        const bDate = new Date(bVal as string);

        // Handle invalid dates - put them at the end with "Not specified" values
        const aIsInvalid = isNaN(aDate.getTime());
        const bIsInvalid = isNaN(bDate.getTime());

        if (aIsInvalid && bIsInvalid) return 0;
        if (aIsInvalid) return 1; // Put invalid dates at end
        if (bIsInvalid) return -1; // Put invalid dates at end

        aVal = aDate.getTime();
        bVal = bDate.getTime();
      }

      // Handle other fields - put "Not specified" at the end
      const aIsNotSpecified =
        !aVal || aVal === "Not specified" || aVal.toString().trim() === "";
      const bIsNotSpecified =
        !bVal || bVal === "Not specified" || bVal.toString().trim() === "";

      if (aIsNotSpecified && bIsNotSpecified) return 0;
      if (aIsNotSpecified) return sortDirection === "asc" ? 1 : -1;
      if (bIsNotSpecified) return sortDirection === "asc" ? -1 : 1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [projects, searchTerm, sortField, sortDirection, filterStage, filterType, filterSource]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredAndSortedProjects.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilter = (type: "stage" | "type" | "source", value: string) => {
    if (type === "stage") {
      setFilterStage(value);
    } else if (type === "type") {
      setFilterType(value);
    } else if (type === "source") {
      setFilterSource(value);
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStage("");
    setFilterType("");
    setFilterSource("");
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    return sortDirection === "asc" ? (
      <svg
        className="w-4 h-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 12l5-5 5 5M7 12l5 5 5-5"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 12l-5 5-5-5M17 12l-5-5-5 5"
        />
      </svg>
    );
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Project Analytics Dashboard
            </h1>
            <p className="text-gray-600 mb-8">
              Access comprehensive project data with advanced filtering and
              analytics
            </p>
            <SignInButton mode="modal">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg">
                Sign In to Continue
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Data
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Project Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <ExportButton
                data={filteredAndSortedProjects}
                filename="project_data"
              />
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Projects
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {projects.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Filtered Results
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {filteredAndSortedProjects.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Filter & Search
            </h2>
            <div className="mt-2 sm:mt-0">
              <span className="text-sm text-gray-500">
                Showing {filteredAndSortedProjects.length} of {projects.length}{" "}
                projects
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Projects
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, location, type..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                  style={{ color: "#111827" }}
                />
              </div>
            </div>

            {/* Stage Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage
              </label>
              <select
                value={filterStage}
                onChange={(e) => handleFilter("stage", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 shadow-sm hover:border-gray-400 transition-colors duration-200"
                style={{ color: "#111827" }}
              >
                <option
                  value=""
                  style={{ color: "#6b7280", fontWeight: "500" }}
                >
                  All Stages
                </option>
                {uniqueStages.map((stage) => (
                  <option
                    key={stage}
                    value={stage}
                    style={{ color: "#111827" }}
                  >
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Type
              </label>
              <select
                value={filterType}
                onChange={(e) => handleFilter("type", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 shadow-sm hover:border-gray-400 transition-colors duration-200"
                style={{ color: "#111827" }}
              >
                <option
                  value=""
                  style={{ color: "#6b7280", fontWeight: "500" }}
                >
                  All Types
                </option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type} style={{ color: "#111827" }}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Type
              </label>
              <select
                value={filterSource}
                onChange={(e) => handleFilter("source", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 shadow-sm hover:border-gray-400 transition-colors duration-200"
                style={{ color: "#111827" }}
              >
                <option
                  value=""
                  style={{ color: "#6b7280", fontWeight: "500" }}
                >
                  All Sources
                </option>
                {uniqueSourceTypes.map((sourceType) => (
                  <option key={sourceType} value={sourceType} style={{ color: "#111827" }}>
                    {sourceType}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterStage || filterType || filterSource) && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: {searchTerm}
                  </span>
                )}
                {filterStage && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Stage: {filterStage}
                  </span>
                )}
                {filterType && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Type: {filterType}
                  </span>
                )}
                {filterSource && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Source: {filterSource}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <TableToolbar
            onRefresh={handleRefresh}
            isLoading={refreshing}
            totalItems={projects.length}
            filteredItems={filteredAndSortedProjects.length}
          />
          {filteredAndSortedProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
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
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projects found
              </h3>
              <p className="text-gray-500 mb-4">
                {projects.length === 0
                  ? "No projects have been added yet."
                  : "Try adjusting your search criteria or filters."}
              </p>
              {projects.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto table-scroll border-t border-gray-200">
                <div className="inline-block min-w-full align-middle">
                  <table
                    className="min-w-full divide-y divide-gray-200"
                    style={{ minWidth: "1450px" }}
                  >
                    <thead className="bg-gray-50">
                      <tr>
                        {[
                          {
                            key: "project_name",
                            label: "Project Name",
                          },
                          { key: "location", label: "Location" },
                          { key: "project_type", label: "Type" },
                          { key: "stage", label: "Stage" },
                          {
                            key: "stakeholders",
                            label: "Stakeholders",
                          },
                          {
                            key: "source_link",
                            label: "Source",
                          },
                          {
                            key: "project_value",
                            label: "Project Value",
                          },
                          {
                            key: "date_added",
                            label: "Date Added",
                          },
                        ].map(({ key, label }) => (
                          <th
                            key={key}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort(key as SortField)}
                            style={{
                              minWidth:
                                key === "project_name"
                                  ? "300px"
                                  : key === "stakeholders"
                                    ? "200px"
                                    : key === "location"
                                      ? "150px"
                                      : key === "project_type"
                                        ? "120px"
                                        : key === "stage"
                                          ? "100px"
                                          : key === "source_link"
                                            ? "80px"
                                            : "120px",
                            }}
                          >
                            <div className="flex items-center space-x-1">
                              <span>{label}</span>
                              {getSortIcon(key as SortField)}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedProjects.map((project, index) => (
                        <tr
                          key={project.id}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-blue-50 transition-all duration-200 cursor-pointer`}
                        >
                          <td
                            className="px-6 py-4"
                            style={{ minWidth: "300px", maxWidth: "400px" }}
                          >
                            <div
                              className="text-sm font-medium text-gray-900 leading-5"
                              title={project.project_name}
                              style={{
                                wordWrap: "break-word",
                                whiteSpace: "normal",
                                lineHeight: "1.4",
                                maxHeight: "4.2em", // Show up to 3 lines
                                overflow: "hidden",
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {project.project_name || "Not specified"}
                            </div>
                          </td>
                          <td
                            className="px-6 py-4 text-sm text-gray-700"
                            style={{ minWidth: "150px" }}
                          >
                            <div
                              title={project.location}
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "120px",
                              }}
                            >
                              {project.location || "Not specified"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {project.project_type || "Not specified"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                project.stage.toLowerCase().includes("approved")
                                  ? "bg-green-100 text-green-800"
                                  : project.stage
                                        .toLowerCase()
                                        .includes("proposed") ||
                                      project.stage
                                        .toLowerCase()
                                        .includes("planning")
                                    ? "bg-yellow-100 text-yellow-800"
                                    : project.stage
                                          .toLowerCase()
                                          .includes("completed")
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {project.stage || "Not specified"}
                            </span>
                          </td>
                          <td
                            className="px-6 py-4 text-sm text-gray-700"
                            style={{ minWidth: "200px" }}
                          >
                            <div
                              title={project.stakeholders}
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "170px",
                              }}
                            >
                              {project.stakeholders || "Not specified"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {project.source_link ? (
                              <a
                                href={project.source_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full hover:opacity-80 transition-colors duration-200 ${
                                  getSourceType(project.source_link) === "PDF"
                                    ? "bg-red-100 text-red-800 hover:bg-red-200"
                                    : getSourceType(project.source_link) === "Texas"
                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                                    : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                }`}
                              >
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                                {getSourceType(project.source_link)}
                              </a>
                            ) : (
                              <span className="text-gray-400">
                                Not specified
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {project.project_value || "Not specified"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {(() => {
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
                              return date.toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              });
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Horizontal scroll indicator */}
              <div className="flex justify-center mt-2">
                <div className="scroll-hint text-xs text-blue-600 px-4 py-2 rounded-full font-medium">
                  ← Scroll horizontally to view all columns →
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 sm:px-6 space-y-4 sm:space-y-0">
                  <div className="flex-1 flex flex-col sm:flex-row sm:justify-between items-center space-y-4 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="mr-2">Show</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 shadow-sm hover:border-gray-400 transition-colors duration-200"
                          style={{ color: "#111827" }}
                        >
                          {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <span className="ml-2">
                          of {filteredAndSortedProjects.length} results
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        Showing {startIndex + 1}-
                        {Math.min(
                          startIndex + itemsPerPage,
                          filteredAndSortedProjects.length,
                        )}{" "}
                        entries
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 19l-7-7 7-7M21 19l-7-7 7-7"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 5l7 7-7 7M5 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
