import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { AllowedRole } from '../../types/auth';
import { ExcelSplitConfig, UploadResponse } from '../../types/ingestion';
import { extractExcelColumnsAndPreview } from '../../utils/excelHeaderReader';
import { uploadExcelWithSplitConfig } from '../../api/ingestApi';
import RoleBadge from '../common/RoleBadge';
import { clsx } from 'clsx';

export type ColumnCategory = 'anchor' | 'public' | 'restricted';

export interface ColumnSetting {
  category: ColumnCategory;
  roles: AllowedRole[];
}

interface ExcelColumnSplitterProps {
  file: File;
  onBack: () => void;
  onUploadSuccess?: (response: UploadResponse) => void;
}

export const ExcelColumnSplitter: React.FC<ExcelColumnSplitterProps> = ({
  file,
  onBack,
  onUploadSuccess,
}) => {
  const navigate = useNavigate();

  const [columns, setColumns] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, unknown>[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, ColumnSetting>>({});
  const [activePreviewRowIndex, setActivePreviewRowIndex] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  // Smart Auto-Preset
  const determineSmartPreset = (colName: string): ColumnSetting => {
    const lower = colName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (
      lower.includes('name') ||
      lower.includes('empid') ||
      lower.includes('employeeid') ||
      lower.includes('id') ||
      lower.includes('email') ||
      lower.includes('title') ||
      lower.includes('role')
    ) {
      return { category: 'anchor', roles: [] };
    }

    if (
      lower.includes('salary') ||
      lower.includes('bonus') ||
      lower.includes('ctc') ||
      lower.includes('compensation') ||
      lower.includes('pip') ||
      lower.includes('rating') ||
      lower.includes('performance') ||
      lower.includes('appraisal')
    ) {
      return { category: 'restricted', roles: ['hr'] };
    }

    if (
      lower.includes('budget') ||
      lower.includes('burn') ||
      lower.includes('cost') ||
      lower.includes('spend') ||
      lower.includes('revenue') ||
      lower.includes('profit')
    ) {
      return { category: 'restricted', roles: ['finance'] };
    }

    return { category: 'public', roles: ['all_employees'] };
  };

  useEffect(() => {
    const loadExcel = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await extractExcelColumnsAndPreview(file);
        setColumns(result.columns);
        setSampleRows(result.sampleRows);
        setSheetNames(result.sheetNames);

        const initialMap: Record<string, ColumnSetting> = {};
        result.columns.forEach((col) => {
          initialMap[col] = determineSmartPreset(col);
        });
        setColumnMap(initialMap);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to parse Excel workbook columns.');
      } finally {
        setIsLoading(false);
      }
    };

    loadExcel();
  }, [file]);

  const setColumnCategory = (col: string, category: ColumnCategory) => {
    setColumnMap((prev) => {
      const current = prev[col] || { category: 'public', roles: [] };
      let defaultRoles: AllowedRole[] = [];
      if (category === 'restricted') {
        defaultRoles = current.roles.length > 0 ? current.roles : ['hr'];
      } else if (category === 'public') {
        defaultRoles = ['all_employees'];
      }
      return {
        ...prev,
        [col]: {
          category,
          roles: defaultRoles,
        },
      };
    });
  };

  const toggleRestrictedRole = (col: string, role: AllowedRole) => {
    setColumnMap((prev) => {
      const current = prev[col] || { category: 'restricted', roles: [] };
      const currentRoles = current.roles;
      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter((r) => r !== role)
        : [...currentRoles, role];

      return {
        ...prev,
        [col]: {
          category: 'restricted',
          roles: newRoles.length > 0 ? newRoles : ['hr'],
        },
      };
    });
  };

  // Compile Split Configuration for Backend
  const buildSplitConfig = (): ExcelSplitConfig => {
    const anchor_columns: string[] = [];
    const public_columns: string[] = [];
    const restricted_column_map: Record<string, AllowedRole[]> = {};

    Object.entries(columnMap).forEach(([col, setting]) => {
      if (setting.category === 'anchor') {
        anchor_columns.push(col);
      } else if (setting.category === 'public') {
        public_columns.push(col);
      } else if (setting.category === 'restricted') {
        restricted_column_map[col] = setting.roles;
      }
    });

    return {
      anchor_columns,
      public_columns,
      public_roles: ['all_employees'],
      restricted_column_map,
    };
  };

  const handlePublishExcel = async () => {
    const config = buildSplitConfig();
    if (config.anchor_columns.length === 0) {
      setErrorMessage('Please designate at least one Anchor Key column (e.g. Employee_Name) to preserve context.');
      return;
    }
    if (config.public_columns.length === 0 && Object.keys(config.restricted_column_map).length === 0) {
      setErrorMessage('Please assign at least one Public or Restricted column.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await uploadExcelWithSplitConfig(file, config);
      setUploadResult(res);
      if (onUploadSuccess) {
        onUploadSuccess(res);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to upload and split Excel file.';
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Row Chunk Simulation Calculations (Microstep 6.3)
  const activeRow = sampleRows[activePreviewRowIndex] || {};
  const splitConfig = buildSplitConfig();

  const anchorParts = splitConfig.anchor_columns
    .filter((col) => activeRow[col] !== undefined && String(activeRow[col]).trim() !== '')
    .map((col) => `${col}: ${String(activeRow[col]).trim()}`);

  const anchorStr = anchorParts.join(' | ');

  const publicParts = splitConfig.public_columns
    .filter((col) => activeRow[col] !== undefined && String(activeRow[col]).trim() !== '')
    .map((col) => `${col}: ${String(activeRow[col]).trim()}`);

  const publicChunkBody = [anchorStr, ...publicParts].filter(Boolean).join(' | ');
  const publicChunkHeading = `Sheet: ${sheetNames[0] || 'Sheet1'} (Row ${activePreviewRowIndex + 2} - General)`;
  const simulatedPublicChunk = `[Section: ${publicChunkHeading}] ${publicChunkBody}`;

  // Group restricted columns by unique role combo
  const roleGroups: Record<string, { roles: AllowedRole[]; columns: string[] }> = {};
  Object.entries(splitConfig.restricted_column_map).forEach(([col, roles]) => {
    const key = [...roles].sort().join(',');
    if (!roleGroups[key]) {
      roleGroups[key] = { roles, columns: [] };
    }
    roleGroups[key].columns.push(col);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Triage Strategy Fork</span>
        </button>

        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
          <span>Path C: Sub-Document Column Splitter</span>
        </span>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-surface-container-high shadow-level-2 p-6 sm:p-8 space-y-6">
        {/* Workbook File Summary Banner */}
        <div className="p-4 rounded-lg bg-surface-container-low border border-surface-container-high flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm font-bold text-on-surface">{file.name}</div>
              <div className="text-xs text-on-surface-variant font-mono">
                {columns.length} Columns Detected • Sheet: "{sheetNames[0] || 'Sheet1'}"
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 text-xs">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-surface-container-high text-on-surface-variant font-medium">
              <span>Smart AI Presets Applied</span>
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-on-surface-variant flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span>Parsing worksheet structure in browser via SheetJS...</span>
          </div>
        ) : errorMessage && !uploadResult ? (
          <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : uploadResult ? (
          /* Completion Card (Microstep 6.4) */
          <div className="p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-on-surface">
                Excel Rows Split & Indexed!
              </h3>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                Every spreadsheet row was cleanly split into public directory and role-restricted vector chunks, preserving your Anchor Keys on both.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high">
                <span className="text-[11px] font-mono uppercase text-on-surface-variant block">Status</span>
                <span className="text-sm font-bold text-emerald-700 capitalize">{uploadResult.status}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high">
                <span className="text-[11px] font-mono uppercase text-on-surface-variant block">Chunks Created</span>
                <span className="text-sm font-bold text-on-surface tabular-nums">{uploadResult.chunks_created ?? 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high">
                <span className="text-[11px] font-mono uppercase text-on-surface-variant block">Strategy</span>
                <span className="text-sm font-bold text-emerald-700">Sub-Doc Split</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-surface-container-high">
              <button
                type="button"
                onClick={() => {
                  setUploadResult(null);
                  onBack();
                }}
                className="btn-secondary w-full sm:w-auto text-xs py-2.5 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ingest Another Document</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="btn-primary w-full sm:w-auto text-xs py-2.5 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Test Queries in Employee Chat</span>
              </button>
            </div>
          </div>
        ) : (
          /* Matrix & Live Simulation */
          <div className="space-y-8">
            {/* 1. Interactive Column Permission Matrix */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                    Column Permission Assignment Matrix
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Designate which columns are shared with all employees vs. locked to specific roles like HR or Finance.
                  </p>
                </div>
              </div>

              <div className="border border-surface-container-high rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-surface-container-high text-on-surface-variant font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-1/4">Column Name</th>
                      <th className="py-3 px-4 w-1/4">Sample Data (Row 1)</th>
                      <th className="py-3 px-4 w-1/2">Classification & Role Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {columns.map((col) => {
                      const setting = columnMap[col] || { category: 'public', roles: [] };
                      const sampleVal = sampleRows[0]?.[col] !== undefined ? String(sampleRows[0][col]) : '';

                      return (
                        <tr key={col} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="py-3.5 px-4 font-mono font-semibold text-on-surface">
                            {col}
                          </td>

                          <td className="py-3.5 px-4 text-on-surface-variant truncate max-w-xs font-mono text-[11px]" title={sampleVal}>
                            {sampleVal || <span className="italic text-on-surface-variant/50">empty</span>}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-3">
                              {/* Anchor Radio */}
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`cat-${col}`}
                                  checked={setting.category === 'anchor'}
                                  onChange={() => setColumnCategory(col, 'anchor')}
                                  className="text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-on-surface">
                                  Anchor Key
                                </span>
                              </label>

                              {/* Public Radio */}
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`cat-${col}`}
                                  checked={setting.category === 'public'}
                                  onChange={() => setColumnCategory(col, 'public')}
                                  className="text-emerald-600 focus:ring-emerald-600 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-emerald-800">
                                  Public Directory
                                </span>
                              </label>

                              {/* Restricted Radio */}
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`cat-${col}`}
                                  checked={setting.category === 'restricted'}
                                  onChange={() => setColumnCategory(col, 'restricted')}
                                  className="text-role-hr focus:ring-role-hr w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-role-hr">
                                  Restricted
                                </span>
                              </label>

                              {/* Role Selectors when Restricted */}
                              {setting.category === 'restricted' && (
                                <div className="flex items-center gap-1.5 pl-2 border-l border-surface-container-high animate-fade-in">
                                  {(['hr', 'finance', 'engineering'] as AllowedRole[]).map((r) => {
                                    const isChecked = setting.roles.includes(r);
                                    return (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() => toggleRestrictedRole(col, r)}
                                        className="focus:outline-none"
                                      >
                                        <RoleBadge
                                          role={r}
                                          size="xs"
                                          variant={isChecked ? 'solid' : 'outline'}
                                          className={clsx(!isChecked && 'opacity-50 hover:opacity-100')}
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Live Row Chunk Preview Simulator (Microstep 6.3) */}
            <div className="space-y-3 pt-2 border-t border-surface-container-high">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                    Live Vector Chunk Simulation
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">
                    (How PostgreSQL stores this row)
                  </span>
                </div>

                {/* Sample Row Picker */}
                {sampleRows.length > 1 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-on-surface-variant font-medium">Preview Row:</span>
                    <div className="inline-flex p-0.5 bg-surface-container-low rounded-lg border border-surface-container-high">
                      {sampleRows.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePreviewRowIndex(idx)}
                          className={clsx(
                            'px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all',
                            activePreviewRowIndex === idx
                              ? 'bg-white text-on-surface shadow-sm'
                              : 'text-on-surface-variant hover:text-on-surface'
                          )}
                        >
                          Row #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Green Public Directory Chunk Preview */}
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RoleBadge role="all_employees" size="xs" variant="solid" />
                      <span className="text-xs font-bold text-emerald-900">
                        Public Directory Chunk
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full font-semibold">
                      Access: All Employees
                    </span>
                  </div>

                  <div className="p-3 bg-white/90 rounded-lg border border-emerald-200/80 font-mono text-[11px] text-on-surface leading-relaxed break-words shadow-sm">
                    {simulatedPublicChunk}
                  </div>

                  <p className="text-[11px] text-emerald-800/80">
                    Accessible to any authenticated company employee. Contains anchor context + public columns only.
                  </p>
                </div>

                {/* Restricted Confidential Chunks Preview */}
                <div className="space-y-3">
                  {Object.keys(roleGroups).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-surface-container-highest p-6 text-center text-xs text-on-surface-variant">
                      No restricted columns configured yet. Select "Restricted" above to preview confidential role-scoped sub-documents.
                    </div>
                  ) : (
                    Object.entries(roleGroups).map(([roleKey, group]) => {
                      const restrictedParts = group.columns
                        .filter((c) => activeRow[c] !== undefined && String(activeRow[c]).trim() !== '')
                        .map((c) => `${c}: ${String(activeRow[c]).trim()}`);

                      const confHeading = `Sheet: ${sheetNames[0] || 'Sheet1'} (Row ${activePreviewRowIndex + 2} - Confidential)`;
                      const confBody = [anchorStr, ...restrictedParts].filter(Boolean).join(' | ');
                      const simulatedConfChunk = `[Section: ${confHeading}] ${confBody}`;

                      const isHr = group.roles.includes('hr');
                      const isFinance = group.roles.includes('finance');

                      return (
                        <div
                          key={roleKey}
                          className={clsx(
                            'rounded-xl border p-4 space-y-2',
                            isHr
                              ? 'border-red-300 bg-red-50/40'
                              : isFinance
                              ? 'border-purple-300 bg-purple-50/40'
                              : 'border-blue-300 bg-blue-50/40'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {group.roles.map((r) => (
                                <RoleBadge key={r} role={r} size="xs" variant="solid" />
                              ))}
                              <span
                                className={clsx(
                                  'text-xs font-bold',
                                  isHr
                                    ? 'text-red-900'
                                    : isFinance
                                    ? 'text-purple-900'
                                    : 'text-blue-900'
                                )}
                              >
                                Confidential Role Chunk
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold uppercase bg-white/80 border border-current/20">
                              Restricted
                            </span>
                          </div>

                          <div className="p-3 bg-white/90 rounded-lg border border-current/20 font-mono text-[11px] text-on-surface leading-relaxed break-words shadow-sm">
                            {simulatedConfChunk}
                          </div>

                          <p className="text-[11px] text-on-surface-variant">
                            Anchor Keys ({splitConfig.anchor_columns.join(', ') || 'None'}) are preserved for context while protecting confidential fields.
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Submission Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-surface-container-high">
              <span className="text-xs text-on-surface-variant flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Enforced by database access control</span>
              </span>

              <button
                type="button"
                disabled={isSubmitting || columns.length === 0}
                onClick={handlePublishExcel}
                className="btn-primary px-8 py-3 text-sm flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Splitting & Indexing Chunks...</span>
                  </>
                ) : (
                  <span>Publish Split Rows to Database</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelColumnSplitter;
